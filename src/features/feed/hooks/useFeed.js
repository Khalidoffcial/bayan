import { useState, useEffect, useCallback, useRef } from "react";
import useSocket from "../../../hooks/useSocket";
import { requestFeed } from "../services/feed.service";

export const useFeed = (type, userId) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const socketRef = useSocket();
  const seenIds = useRef(new Set());
  const fetchingRef = useRef(false);

  const fetchFeed = useCallback((isInitial = false) => {
    if (!userId || fetchingRef.current || (!isInitial && !hasMore)) return;

    fetchingRef.current = true;
    setLoading(true);
    const currentCursor = isInitial ? 0 : cursor;

    requestFeed(socketRef.current, {
      userId,
      type: type || "posts",
      cursor: currentCursor,
      limit: 10,
    });
  }, [type, userId, cursor, hasMore, socketRef]);

  useEffect(() => {
    const handleFeedResult = (res) => {
      const items = res?.items || [];
      const filtered = items.filter((item) => !seenIds.current.has(item.id));
      filtered.forEach((item) => seenIds.current.add(item.id));

      setFeed((prev) => [...prev, ...filtered]);
      if (res?.nextCursor !== null && res?.nextCursor !== undefined) {
        setCursor(res.nextCursor);
      } else {
        setHasMore(false);
      }
      fetchingRef.current = false;
      setLoading(false);
    };

    const handleNewPost = (post) => {
      if (post?.id && !seenIds.current.has(post.id)) {
        seenIds.current.add(post.id);
        setFeed((prev) => [post, ...prev]);
      }
    };

    const socket = socketRef.current;
    socket?.on("FEED_RESULT", handleFeedResult);
    socket?.on("NEW_POST", handleNewPost);

    return () => {
      socket?.off("FEED_RESULT", handleFeedResult);
      socket?.off("NEW_POST", handleNewPost);
    };
  }, [socketRef]);

  const resetFeed = useCallback(() => {
    setFeed([]);
    setCursor(0);
    setHasMore(true);
    seenIds.current.clear();
    fetchingRef.current = false;
  }, []);

  return { feed, loading, hasMore, fetchFeed, resetFeed, socketRef };
};

export default useFeed;
