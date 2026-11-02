import { useState, useEffect, useCallback, useRef } from "react";
import useSocket from "../../../hooks/useSocket";
import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";
import {
  requestProfileContent,
  normalizeProfileItem,
  extractProfileItems,
  extractNextCursor,
  extractCounts,
} from "../services/profileContent.service";
import { profileContentStore } from "../services/profileContentStore";

/** Tab key (plural) → item kind (singular) — single source of truth for the
 *  client/server naming difference. Server also accepts these tab names. */
const TAB_TO_KIND = {
  posts: "post",
  replies: "reply",
  articles: "article",
  novels: "novel",
};

/**
 * Loads the unified profile content feed (posts + replies + articles +
 * novels) for the GIVEN profile owner, cache-first:
 *
 * - Instant hydration from profileContentStore on mount / tab switch /
 *   returning from a reading page (zero network when fresh).
 * - SWR refresh: one page re-fetch merged on top after the staleness window.
 * - Tab changes reuse each tab's own cached page & cursor.
 * - Rapid tab switching is safe: every fetch resolves into its OWN entry;
 *   a response can only update the tab it was requested for (request token).
 */
export const useProfileContent = (profileUserId) => {
  const cached = profileUserId
    ? profileContentStore.get(profileUserId, "all")
    : { items: [], counts: {}, error: null };

  const [items, setItems] = useState(cached.items);
  const [counts, setCounts] = useState(cached.counts);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(cached.isEmpty && !cached.everFetched);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(cached.error);
  const [hasMore, setHasMore] = useState(cached.hasMore);

  const socketRef = useSocket();
  const tabRef = useRef(activeTab);
  const userIdRef = useRef(profileUserId);
  const pendingResponses = useRef(new Map());
  const requestToken = useRef(0);

  useEffect(() => { tabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { userIdRef.current = profileUserId; }, [profileUserId]);

  const applySnapshot = useCallback((userId, tab) => {
    const snap = profileContentStore.get(userId, tab);
    setItems(snap.items);
    setCounts(snap.counts);
    setError(snap.error);
    setHasMore(snap.hasMore);
    return snap;
  }, []);

  const fetchPage = useCallback((isInitial) => {
    const userId = userIdRef.current;
    const tab = tabRef.current;
    if (!userId) return;

    const snap = profileContentStore.get(userId, tab);

    // Cache-first guards: fresh cache (initial) or exhausted pagination.
    if (isInitial && snap.isFresh) { setLoading(false); return; }
    if (!isInitial && !snap.hasMore) return;

    const token = ++requestToken.current;
    if (isInitial) { setLoading(true); setError(null); }
    else setLoadingMore(true);

    requestProfileContent(socketRef.current, {
      userId,
      type: tab,
      cursor: isInitial ? 0 : snap.cursor,
      limit: FEED_BATCH_SIZE,
    });

    // Response correlation: stash the resolving handler keyed by token so the
    // CONTENT_RESULT listener can route it (profile payload carries no echo).
    pendingResponses.current.set(token, { userId, tab, isInitial, requestedAt: Date.now() });
  }, [socketRef]);

  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);

  const retry = useCallback(() => {
    const userId = userIdRef.current;
    if (userId) {
      // drop this tab's entry so the retry fetches from cursor 0
      profileContentStore.mergePage(userId, tabRef.current, [], { nextCursor: 0, replace: true });
    }
    setLoading(true);
    setError(null);
    fetchPage(true);
  }, [fetchPage]);

  // Hydrate / refetch on tab change or profile owner change — cache-first.
  useEffect(() => {
    if (!profileUserId) return;
    const snap = applySnapshot(profileUserId, activeTab);
    if (snap.everFetched && snap.isFresh) {
      setLoading(false);
      return; // warm & fresh → instant render, zero requests
    }
    setLoading(snap.isEmpty);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId, activeTab]);

  // ---- Socket listeners ----
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const consumeOldestPending = () => {
      // CONTENT_RESULT carries no request echo — route to the OLDEST pending
      // request (requests resolve roughly in order per socket connection).
      let oldestKey = null;
      let oldestTs = Infinity;
      for (const [k, v] of pendingResponses.current) {
        if (v.requestedAt < oldestTs) { oldestTs = v.requestedAt; oldestKey = k; }
      }
      if (oldestKey == null) return null;
      const ctx = pendingResponses.current.get(oldestKey);
      pendingResponses.current.delete(oldestKey);
      return ctx;
    };

    const isCurrentRequest = (ctx) =>
      ctx &&
      String(ctx.userId) === String(userIdRef.current) &&
      ctx.tab === tabRef.current;

    const handleResult = (res) => {
      const ctx = consumeOldestPending();
      if (!ctx) return;

      const raw = extractProfileItems(res);
      const normalized = raw
        .map((item, i) => normalizeProfileItem(item, i))
        .filter(Boolean)
        .filter((item) => {
          // Defense-in-depth: enforce tab semantics on top of server filtering.
          // Tabs are PLURAL ("posts"/"articles"/"novels"), items' kind is
          // SINGULAR ("post"/"article"/"novel") — compare through the map,
          // never string-equal (that silently emptied every tab but "all").
          if (ctx.tab === "all") return true;
          if (ctx.tab === "replies") return item.kind === "reply";
          return item.kind === TAB_TO_KIND[ctx.tab];
        });

      const nextCursor = extractNextCursor(res);
      const serverCounts = extractCounts(res);

      const updated = profileContentStore.mergePage(
        ctx.userId, ctx.tab, normalized,
        { nextCursor, replace: ctx.isInitial, counts: serverCounts || undefined }
      );

      // Only the tab that made the request updates the visible list.
      if (isCurrentRequest(ctx)) {
        setItems(updated);
        if (serverCounts) setCounts(serverCounts);
        setHasMore(nextCursor != null);
        setError(null);
      }
      setLoading(false);
      setLoadingMore(false);
    };

    const handleNewContent = (item) => {
      if (!item || typeof item !== "object") return;
      const normalized = normalizeProfileItem(item);
      if (!normalized) return;

      const ownerId = String(userIdRef.current || "");
      // Only content authored by THIS profile owner enters this profile's feed.
      if (!ownerId || normalized.autherID !== ownerId) return;

      // Prepend into the "all" cache and the matching tab cache (both may be
      // visited next); visible list updates only if the active tab matches.
      // Store keys are PLURAL tab names — never the singular kind.
      profileContentStore.prependItem(ownerId, "all", normalized);
      const owningTab = Object.keys(TAB_TO_KIND).find((t) => TAB_TO_KIND[t] === normalized.kind);
      if (owningTab) {
        profileContentStore.prependItem(ownerId, owningTab, normalized);
        if (tabRef.current === "all" || tabRef.current === owningTab) {
          applySnapshot(ownerId, tabRef.current);
        }
      }
    };

    const handleLocalNewContent = (event) => {
      if (event.detail) handleNewContent(event.detail);
    };

    const handleError = (err) => {
      pendingResponses.current.clear();
      setLoading(false);
      setLoadingMore(false);
      setError(err?.message || "تعذّر تحميل المحتوى");
      profileContentStore.setError(userIdRef.current, tabRef.current, err?.message || "تعذّر تحميل المحتوى");
    };

    const handleContentDeleted = (payload) => {
      const deletedId = payload?.id != null ? String(payload.id) : null;
      if (!deletedId || !userIdRef.current) return;
      // Remove from every cached tab of this owner; visible list updates now.
      for (const tab of ["all", "posts", "replies", "articles", "novels"]) {
        profileContentStore.removeItem(userIdRef.current, tab, deletedId);
      }
      applySnapshot(userIdRef.current, tabRef.current);
    };

    const handleLocalContentDeleted = (event) => {
      if (event.detail) handleContentDeleted(event.detail);
    };

    socket.on("CONTENT_RESULT", handleResult);
    socket.on("NEW_POST", handleNewContent);
    socket.on("CONTENT_DELETED", handleContentDeleted);
    window.addEventListener("BAYAN_NEW_POST", handleLocalNewContent);
    window.addEventListener("BAYAN_CONTENT_DELETED", handleLocalContentDeleted);
    socket.on("connect_error", handleError);
    socket.on("error", handleError);

    return () => {
      socket.off("CONTENT_RESULT", handleResult);
      socket.off("NEW_POST", handleNewContent);
      socket.off("CONTENT_DELETED", handleContentDeleted);
      socket.off("connect_error", handleError);
      socket.off("error", handleError);
      window.removeEventListener("BAYAN_NEW_POST", handleLocalNewContent);
      window.removeEventListener("BAYAN_CONTENT_DELETED", handleLocalContentDeleted);
    };
  }, [socketRef, applySnapshot]);

  return {
    items,
    counts,
    activeTab,
    setActiveTab,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
};

export default useProfileContent;
