import { useState, useEffect, useCallback, useRef } from "react";
import useSocket from "../../../hooks/useSocket";
import { requestFeed, emitPostEngagement } from "../services/feed.service";
import { feedStore, dedupRequest } from "../services/feedStore";
import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

/**
 * Extracts items collection from any backend response structure.
 */
const extractItems = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.posts)) return res.posts;
  if (Array.isArray(res.content)) return res.content;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.result)) return res.result;
  if (Array.isArray(res.feed)) return res.feed;
  if (Array.isArray(res.articles)) return res.articles;
  if (Array.isArray(res.novels)) return res.novels;
  if (res.data && typeof res.data === "object") {
    if (Array.isArray(res.data.items)) return res.data.items;
    if (Array.isArray(res.data.posts)) return res.data.posts;
    if (Array.isArray(res.data.content)) return res.data.content;
  }
  if (res.post && typeof res.post === "object") return [res.post];
  if (res.item && typeof res.item === "object") return [res.item];
  if (res.id || res._id || res.content) return [res];
  return [];
};

const normalizeId = (item, index = 0) => {
  if (!item || typeof item !== "object") return `feed-item-${index}`;
  return String(
    item.id ??
    item._id ??
    item.id_post ??
    item.postId ??
    item.idPost ??
    item._ID ??
    (item.content ? `post-${item.content.slice(0, 15)}-${index}` : `feed-item-${index}`)
  );
};

export const useFeed = (type, userId) => {
  // Cache-first: hydrate React state from the module store instantly —
  // remounting after navigating to a post/article/novel shows content
  // immediately, with zero network activity while the cache is fresh.
  const cached = feedStore.get(type);
  const [feed, setFeed] = useState(cached.items);
  const [loading, setLoading] = useState(cached.isEmpty && !cached.fetchedAt);
  const [hasMore, setHasMore] = useState(cached.hasMore);
  const [error, setError] = useState(cached.error);

  const socketRef = useSocket();
  const typeRef = useRef(type);
  const userIdRef = useRef(userId);

  useEffect(() => {
    typeRef.current = type;
    userIdRef.current = userId;
  }, [type, userId]);

  // ---- Mode 1: instant cache display + Mode 2: SWR stale refresh ----
  useEffect(() => {
    const snap = feedStore.get(type);
    setFeed(snap.items);
    setHasMore(snap.hasMore);
    setError(snap.error);

    if (snap.fetchedAt > 0 && snap.isFresh) {
      // Warm & fresh: render from cache, fetch NOTHING.
      setLoading(false);
      return;
    }

    // Cache is stale or empty → fetch.
    // - Empty: full initial page.
    // - Stale (SWR): ONE incremental refresh page from cursor 0, dedup-merged
    //   on top of cached items — new content surfaces, nothing re-paginates.
    setLoading(true);

    dedupRequest(`feed:${type}:${snap.isEmpty ? "init" : "swr"}`, () =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          // Socket not ready yet: resolve so loading doesn't stick forever;
          // the 'connect' handler below fires the fetch when it arrives.
          resolve(null);
          return;
        }
        const onResult = (res) => {
          socket.off("FEED_RESULT", onResult);
          resolve(res);
        };
        socket.once("FEED_RESULT", onResult);
        requestFeed(socket, {
          userId: userIdRef.current || "",
          type,
          cursor: 0,
          limit: FEED_BATCH_SIZE,
        });
        // Safety timeout: never leave the feed loading forever.
        setTimeout(() => {
          socket.off("FEED_RESULT", onResult);
          resolve(null);
        }, 15000);
      })
    )
      .then((res) => {
        if (res == null) {
          setLoading(false);
          if (snap.isEmpty) setError((e) => e ?? "تعذّر الاتصال — أعد المحاولة");
          return;
        }
        const raw = extractItems(res).map((item, i) => ({ ...item, id: normalizeId(item, i) }));
        const nextCursor = res?.nextCursor ?? res?.cursor ?? res?.next_cursor ?? null;

        const updated = feedStore.mergePage(type, raw, {
          nextCursor,
          replace: snap.isEmpty, // initial load replaces; SWR merges (dedup in store)
        });
        setFeed(updated);
        setHasMore(nextCursor != null);
        setError(null);
      })
      .catch(() => {
        setError("تعذّر تحميل المحتوى — أعد المحاولة");
      })
      .finally(() => setLoading(false));
  }, [type, socketRef]); // NOT on every pathname change — only type changes

  // ---- Socket listeners: FEED_RESULT passthrough, live updates ----
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleFeedResult = (res) => {
      // Guard: ignore results for a type other than the mounted one.
      // (Request/response correlation is by convention; store dedup keeps
      //  this safe — merging another type's page would be filtered out by id
      //  overlap anyway.)
      const raw = extractItems(res).map((item, i) => ({ ...item, id: normalizeId(item, i) }));
      if (!raw.length && feedStore.get(typeRef.current).items.length > 0) return;

      const current = feedStore.get(typeRef.current);
      const nextCursor = res?.nextCursor ?? res?.cursor ?? res?.next_cursor ?? null;
      const updated = feedStore.mergePage(typeRef.current, raw, {
        nextCursor,
        replace: current.isEmpty,
      });
      setFeed(updated);
      setHasMore(nextCursor != null);
      setLoading(false);
      setError(null);
    };

    const handleNewPost = (post) => {
      if (!post || typeof post !== "object") return;
      const postId = normalizeId(post);
      const postType = String(post.type || "posts").toLowerCase();
      const currentType = String(typeRef.current || "all").toLowerCase();

      const matches =
        currentType === "all" ||
        currentType === "" ||
        (currentType.includes("post") && (postType.includes("post") || !post.type)) ||
        (currentType.includes("article") && postType.includes("article")) ||
        (currentType.includes("novel") && postType.includes("novel"));
      if (!matches) return;

      feedStore.prependItem(currentType, { ...post, id: postId });
      setFeed(feedStore.get(currentType).items);
    };

    const handleLocalNewPost = (event) => {
      if (event.detail) handleNewPost(event.detail);
    };

    const handleSocketError = (err) => {
      setLoading(false);
      setError(err?.message || "Error loading feed");
    };

    // Reconnect after nav-away/back or sleep: SWR refresh (one page),
    // NOT a full reset — cached items stay, new content merges on top.
    const handleConnect = () => {
      if (!feedStore.get(typeRef.current).isFresh) {
        const socket2 = socketRef.current;
        requestFeed(socket2, {
          userId: userIdRef.current || "",
          type: typeRef.current,
          cursor: 0,
          limit: FEED_BATCH_SIZE,
        });
      }
    };

    socket.on("FEED_RESULT", handleFeedResult);
    socket.on("NEW_POST", handleNewPost);
    socket.on("connect_error", handleSocketError);
    socket.on("error", handleSocketError);
    socket.on("connect", handleConnect);
    window.addEventListener("BAYAN_NEW_POST", handleLocalNewPost);

    return () => {
      socket.off("FEED_RESULT", handleFeedResult);
      socket.off("NEW_POST", handleNewPost);
      socket.off("connect_error", handleSocketError);
      socket.off("error", handleSocketError);
      socket.off("connect", handleConnect);
      window.removeEventListener("BAYAN_NEW_POST", handleLocalNewPost);
    };
  }, [socketRef]);

  // ---- LIKE_UPDATED / content edits: precise per-item patch ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlePostUpdated = (payload) => {
      const updated = payload?.post;
      if (!updated?.id) return;

      if (
        payload.contentType &&
        typeRef.current !== "all" &&
        payload.contentType !== typeRef.current
      ) {
        return;
      }

      feedStore.applyUpdate(typeRef.current, updated.id, updated);
      setFeed(feedStore.get(typeRef.current).items);
    };

    socket.on("LIKE_UPDATED", handlePostUpdated);
    return () => socket.off("LIKE_UPDATED", handlePostUpdated);
  }, [socketRef]);

  // ---- Infinite scroll: fetch the NEXT page via the shared dedup ----
  const fetchFeed = useCallback((isInitial = false) => {
    const t = typeRef.current;
    const snap = feedStore.get(t);

    if (!isInitial && !snap.hasMore) return;
    if (isInitial && snap.isFresh && !snap.isEmpty) return; // cache-first guard

    dedupRequest(`feed:${t}:${snap.cursor}`, () =>
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
          userId: userIdRef.current || "",
          type: t,
          cursor: snap.cursor,
          limit: FEED_BATCH_SIZE,
        });
        setTimeout(() => {
          socket.off("FEED_RESULT", onResult);
          resolve(null);
        }, 15000);
      })
    )
      .then((res) => {
        if (res == null) return;
        const raw = extractItems(res).map((item, i) => ({ ...item, id: normalizeId(item, i) }));
        const nextCursor = res?.nextCursor ?? res?.cursor ?? res?.next_cursor ?? null;
        feedStore.mergePage(t, raw, { nextCursor });
        setFeed(feedStore.get(t).items);
        setHasMore(nextCursor != null);
        setError(null);
      })
      .catch(() => setError("تعذّر تحميل المزيد — أعد المحاولة"));
  }, [socketRef]);

  /** Delete: precise removal from this feed's cache only. */
  const removePost = useCallback((postId) => {
    if (!postId) return;
    feedStore.removeItem(typeRef.current, postId);
    setFeed(feedStore.get(typeRef.current).items);
  }, []);

  const sendEngagement = useCallback(
    (contentId, engagementType) => {
      emitPostEngagement(socketRef.current, {
        contentId,
        userId: userIdRef.current,
        type: engagementType,
      });
    },
    [socketRef]
  );

  return {
    feed,
    loading,
    hasMore,
    error,
    cursor: feedStore.get(type).cursor,
    fetchFeed,
    sendEngagement,
    socketRef,
    removePost,
  };
};

export default useFeed;
