/**
 * flow.service.js — data layer for Bayan Flow.
 *
 * REUSES the existing infrastructure — no new backend, no new endpoints:
 *  - the shared Socket.IO singleton (hooks/useSocket) via feed.service's
 *    requestFeed (GET_FEED → FEED_RESULT), which is cursor-paginated and
 *    server-ranked (recommendFeed: interests + recency + engagement).
 *  - dedupRequest (feedStore) so rapid swipes never fire duplicate
 *    GET_FEED requests for the same page.
 *
 * Flow-specific concerns handled here:
 *  - streaming buffer: pages arrive in background while the user swipes;
 *  - mixed-type sequencing: the server's "all" feed already interleaves
 *    posts/articles/novels; Flow reshuffles only within the already-fetched
 *    buffer (never re-requests more to chase variety);
 *  - seen-suppression window: recently displayed ids are kept out of the
 *    next shuffle so the same item does not reappear back-to-back
 *    (a light anti-loop guard, NOT a recommendation engine);
 *  - prefetch-of-next: ask for one more page when the buffer runs low,
 *    BEFORE the user hits the end (cancel-safe: single in-flight promise).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { requestFeed } from "../../feed/services/feed.service";
import { dedupRequest } from "../../feed/services/feedStore";
import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";
import useSocket from "../../../hooks/useSocket";

/** Flow keeps its own store key so it never fights the Home feed cache. */
export const FLOW_TYPE = "all";

/** Number of items to keep buffered ahead of the active index. */
const BUFFER_LOW_WATERMARK = 3;

/**
 * Extract + normalize items exactly like useFeed does (same field-tolerant
 * logic, same id normalization) so Flow consumes identical item shapes.
 */
const extractItems = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.posts)) return res.posts;
  if (Array.isArray(res.content)) return res.content;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.feed)) return res.feed;
  return [];
};

const normalizeId = (item, index = 0) =>
  String(
    item.id ??
    item._id ??
    item.id_post ??
    item.postId ??
    (item.content ? `post-${item.content.slice(0, 15)}-${index}` : `flow-item-${index}`)
  );

/** Classify an item into a Flow presentation kind from its real fields. */
export const itemKind = (item) => {
  if (!item) return "post";
  const t = String(item.type || "").toLowerCase();
  if (t.startsWith("article")) return "article";
  if (t.startsWith("novel")) return "novel";
  // Replies are posts (first-class replies); treat comment_on as post too.
  return "post";
};

/**
 * Has the item any media? (drives Flow media presentation)
 * Returns "video" | "image" | null.
 */
export const itemMediaKind = (item) => {
  const media = Array.isArray(item?.media) ? item.media : [];
  if (media.some((m) => m?.kind === "video" && m?.url)) return "video";
  if (media.some((m) => m?.url) || item?.img?.length) return "image";
  return null;
};

/**
 * useFlowFeed — the Flow feed engine.
 *
 * Public API:
 *   items       → the ordered, presentation-ready buffer
 *   loading     → first-page loading state
 *   loadingMore → background page fetch in progress
 *   error       → last error (string) or null
 *   refresh()   → full restart (cursor 0, fresh shuffle)
 *   loadMore()  → extend the buffer (called automatically when low)
 *   markSeen(id)→ record viewed ids for anti-repeat
 */
export const useFlowFeed = ({ userId }) => {
  // Reuse the shared socket singleton — Flow adds ZERO new connections.
  const socketRef = useSocket();

  const stateRef = useRef({
    items: [],
    seen: new Set(), // ids shown recently (anti-repeat window)
    cursor: 0,
    hasMore: true,
    firstLoaded: false,
    loadingMore: false,
  });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Shuffle within a page-sized batch only — preserves the server's
   * inter-type ordering trend while decorrelating identical adjacent
   * items. O(n) Fisher-Yates over the fetched slice.
   */
  const shuffleBatch = (batch) => {
    const arr = [...batch];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /** Fetch one page from the server through the deduped request helper.
      Resolves null ONLY on transport failure (timeout/disconnect) —
      a real empty page from the server resolves as an empty array. */
  const fetchPage = useCallback(
    (cursor) =>
      dedupRequest(`flow:${FLOW_TYPE}:${cursor}`, () =>
        new Promise((resolve) => {
          const socket = socketRef.current;
          if (!socket?.connected) {
            resolve(null);
            return;
          }
          const onResult = (res) => {
            socket.off("FEED_RESULT", onResult);
            resolve(res);
          };
          socket.once("FEED_RESULT", onResult);
          requestFeed(socket, {
            userId: userId || "",
            type: FLOW_TYPE,
            cursor,
            limit: FEED_BATCH_SIZE,
          });
          // Never hang: same 15s guard the Home feed uses.
          setTimeout(() => {
            socket.off("FEED_RESULT", onResult);
            resolve(null);
          }, 15000);
        })
      ),
    [socketRef, userId]
  );

  /** Extend the buffer with a fresh page (dedup + shuffle + seen-suppress). */
  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (s.loadingMore || !s.hasMore) return;
    s.loadingMore = true;
    setLoadingMore(true);

    try {
      const res = await fetchPage(s.cursor);
      if (res == null) {
        // Transport failure (socket not connected / timeout) — retryable.
        console.error("[Flow] feed request failed: no server response (transport)");
        if (!s.firstLoaded) setError("retryable");
        return;
      }
      const raw = extractItems(res).map((item, i) => ({
        ...item,
        id: normalizeId(item, i),
        _kind: itemKind(item),
      }));
      const nextCursor = res?.nextCursor ?? res?.cursor ?? res?.next_cursor ?? null;

      // Drop items already seen this session (anti-repeat), dedup in-buffer.
      const inBuffer = new Set(s.items.map((i) => i.id));
      const fresh = raw.filter((i) => !inBuffer.has(i.id) && !s.seen.has(i.id));

      s.items = [...s.items, ...shuffleBatch(fresh.length ? fresh : raw)];
      if (nextCursor != null) s.cursor = nextCursor;
      s.hasMore = nextCursor != null;
      s.firstLoaded = true;
      setError(null);
      setItems([...s.items]);
    } catch (err) {
      // Safe log — message only, never payloads/tokens/user data.
      console.error("[Flow] feed load failed:", err?.message || err);
      if (!stateRef.current.firstLoaded) setError("retryable");
    } finally {
      stateRef.current.loadingMore = false;
      setLoadingMore(false);
    }
  }, [fetchPage]);

  /** Auto-top-up: called after every index change. */
  const ensureBuffer = useCallback(
    (activeIndex) => {
      const remaining = stateRef.current.items.length - activeIndex - 1;
      if (remaining <= BUFFER_LOW_WATERMARK && stateRef.current.hasMore) {
        loadMore();
      }
    },
    [loadMore]
  );

  /** Mark an item as consumed for the anti-repeat window. */
  const markSeen = useCallback((id) => {
    if (id) stateRef.current.seen.add(String(id));
  }, []);

  /** Full restart — clear buffer, reset cursor, refetch. */
  const refresh = useCallback(async () => {
    stateRef.current = {
      items: [],
      seen: stateRef.current.seen, // keep seen across refresh (anti-loop)
      cursor: 0,
      hasMore: true,
      firstLoaded: false,
      loadingMore: false,
    };
    setItems([]);
    setLoading(true);
    setError(null);
    await loadMore();
    setLoading(false);
  }, [loadMore]);

  /** Initial load. */
  useEffect(() => {
    let alive = true;
    (async () => {
      await loadMore();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    refresh,
    ensureBuffer,
    markSeen,
    hasMore: stateRef.current.hasMore,
  };
};


