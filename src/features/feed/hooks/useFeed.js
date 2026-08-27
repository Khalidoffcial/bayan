import { useState, useEffect, useCallback, useRef } from "react";
import useSocket from "../../../hooks/useSocket";
import { requestFeed } from "../services/feed.service";
import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

/**
 * Extracts items collection from any backend response structure.
 * Supports: direct array, { posts: [] }, { items: [] }, { content: [] }, { data: [] }, { result: [] }, etc.
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
  // Single object payload fallback
  if (res.post && typeof res.post === "object") return [res.post];
  if (res.item && typeof res.item === "object") return [res.item];
  if (res.id || res._id || res.content) return [res];
  return [];
};

/**
 * Normalizes item ID across all backend schema variations.
 */
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
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const socketRef = useSocket();
  const seenIds = useRef(new Set());
  const fetchingRef = useRef(false);
  const cursorRef = useRef(0);
  const hasMoreRef = useRef(true);
  const typeRef = useRef(type);
  const userIdRef = useRef(userId);

  // Sync refs when type or userId changes
  useEffect(() => {
    typeRef.current = type;
    userIdRef.current = userId;
  }, [type, userId]);

  const resetFeed = useCallback(() => {
    setFeed([]);
    setCursor(0);
    cursorRef.current = 0;
    setHasMore(true);
    hasMoreRef.current = true;
    setError(null);
    seenIds.current.clear();
    fetchingRef.current = false;
    setLoading(false);
  }, []);

  const fetchFeed = useCallback((isInitial = false) => {
    if (fetchingRef.current || (!isInitial && !hasMoreRef.current)) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    const targetCursor = isInitial ? 0 : cursorRef.current;
    if (isInitial) {
      cursorRef.current = 0;
      setCursor(0);
      seenIds.current.clear();
    }

    requestFeed(socketRef.current, {
      userId: userIdRef.current || "",
      type: typeRef.current || "posts",
      cursor: targetCursor,
      limit: FEED_BATCH_SIZE,
    });
  }, [socketRef]);

  useEffect(() => {
    const handleFeedResult = (res) => {
      const rawItems = extractItems(res);
      const items = rawItems.map((item, index) => ({
        ...item,
        id: normalizeId(item, index),
      }));

      // Deduplicate against seen IDs
      const filtered = items.filter((item) => !seenIds.current.has(item.id));
      filtered.forEach((item) => seenIds.current.add(item.id));

      // Append new items to client-side feed cache ensuring strict ID uniqueness
      setFeed((prev) => {
        const existingIds = new Set(prev.map((p) => String(p.id ?? p._id ?? p.id_post ?? "")));
        const unique = filtered.filter((item) => !existingIds.has(String(item.id)));
        return [...prev, ...unique];
      });

      // Update cursor progression
      let nextCursorValue = null;
      if (res?.nextCursor !== null && res?.nextCursor !== undefined) {
        nextCursorValue = res.nextCursor;
      } else if (res?.cursor !== null && res?.cursor !== undefined) {
        nextCursorValue = res.cursor;
      } else if (res?.next_cursor !== null && res?.next_cursor !== undefined) {
        nextCursorValue = res.next_cursor;
      } else if (rawItems.length > 0) {
        nextCursorValue = cursorRef.current + rawItems.length;
      }

      if (nextCursorValue !== null) {
        setCursor(nextCursorValue);
        cursorRef.current = nextCursorValue;
      }

      // Check if more items remain
      const reachedEnd =
        res?.hasMore === false ||
        rawItems.length === 0 ||
        (rawItems.length < FEED_BATCH_SIZE &&
          (res?.nextCursor === null || res?.nextCursor === undefined) &&
          (res?.cursor === null || res?.cursor === undefined));

      const newHasMore = !reachedEnd;
      setHasMore(newHasMore);
      hasMoreRef.current = newHasMore;

      fetchingRef.current = false;
      setLoading(false);
    };

    const handleNewPost = (post) => {
      if (!post || typeof post !== "object") return;
      const postId = normalizeId(post);

      const currentType = String(typeRef.current || "posts").toLowerCase();
      const postType = String(post.type || "posts").toLowerCase();

      // Check if post matches active feed channel filter
      const matches =
        currentType === "all" ||
        currentType === "" ||
        (currentType.includes("post") && (postType.includes("post") || !post.type)) ||
        (currentType.includes("article") && postType.includes("article")) ||
        (currentType.includes("novel") && postType.includes("novel"));

      if (!matches) return;

      if (!seenIds.current.has(postId)) {
        seenIds.current.add(postId);
        const normalized = { ...post, id: postId };
        setFeed((prev) => {
          const exists = prev.some((p) => String(p.id ?? p._id ?? p.id_post ?? "") === postId);
          if (exists) return prev;
          return [normalized, ...prev];
        });
      }
    };

    const handleLocalNewPost = (event) => {
      if (event.detail) {
        handleNewPost(event.detail);
      }
    };

    window.addEventListener("BAYAN_NEW_POST", handleLocalNewPost);

    const handleSocketError = (err) => {
      fetchingRef.current = false;
      setLoading(false);
      setError(err?.message || "Error loading feed");
    };

    const socket = socketRef?.current;
    if (socket) {
      socket.on("FEED_RESULT", handleFeedResult);
      socket.on("NEW_POST", handleNewPost);
      socket.on("connect_error", handleSocketError);
      socket.on("error", handleSocketError);

      const handleConnect = () => {
        fetchFeed(true);
      };
      socket.on("connect", handleConnect);
      if (socket.connected) {
        fetchFeed(true);
      }

      return () => {
        socket.off("FEED_RESULT", handleFeedResult);
        socket.off("NEW_POST", handleNewPost);
        socket.off("connect_error", handleSocketError);
        socket.off("error", handleSocketError);
        socket.off("connect", handleConnect);
        window.removeEventListener("BAYAN_NEW_POST", handleLocalNewPost);
      };
    }
  }, [socketRef, fetchFeed]);

  return { feed, loading, hasMore, error, cursor, fetchFeed, resetFeed, socketRef };
};

export default useFeed;
