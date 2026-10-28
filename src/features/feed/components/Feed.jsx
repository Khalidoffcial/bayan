import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";

// Writer (inline composer)
import Writer from "../../writer/components/Writer";

// Hooks & Utils
import useAuth from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useFeed from "../hooks/useFeed";
import { getDirection } from "../../../utils/helpers";
import { FEED_PREFETCH_THRESHOLD_PX } from "../../../constants/feedConfig";

// Shared Layout & UI Components
import Top from "../../../components/layout/Top";
import Sidebar from "../../../components/layout/Sidebar";
import InterestsPopup from "../../../components/common/InterestsModal";
import Loader from "../../../components/ui/Loader";

// Feature Components
import FeedList from "./FeedList";
import "../styles/feed.css";

export const Feed = () => {
  const { typeArticle } = useParams();
  const location = useLocation();
  const { user } = useAuth();
    const navigate = useNavigate();
  

  const {
    feed,
    loading,
    hasMore,
    error,
    fetchFeed,
    resetFeed,
    sendEngagement

  } = useFeed(typeArticle || "posts", user?.id);

  // Local UI State
  const [likedPosts, setLikedPosts] = useState({});
  const [likesCount, setLikesCount] = useState({});
  // Inline comments: single expanded section at a time (null = all collapsed).
  const [activeCommentId, setActiveCommentId] = useState(null);

  // Initial Load & Reset on route/filter changes
  useEffect(() => {
    resetFeed();
    fetchFeed(true);
  }, [location.pathname, typeArticle, user?.id, fetchFeed, resetFeed]);

  // Intelligent Infinite Scroll & Prefetch
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
          // Trigger prefetch when reaching threshold near the end of the cached batch
          if (scrollTop + clientHeight >= scrollHeight - FEED_PREFETCH_THRESHOLD_PX) {
            fetchFeed();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchFeed]);

  // Handlers
const handleLike = useCallback(
  (postId) => {
    if (!user?.id || !postId) return;

    const post = feed.find(
      (item) => String(item.id) === String(postId)
    );

    if (!post) return;

    const wasLiked =
      likedPosts[postId] ??
      Boolean(post.likesBy?.[user.id]);

    const currentCount = Number(
      likesCount[postId] ??
      post.likesCount ??
      post.likes ??
      0
    );

    // تحديث حالة اللايك واللون
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !wasLiked,
    }));

    // تحديث العداد
    setLikesCount((prev) => ({
      ...prev,
      [postId]: Math.max(
        0,
        currentCount + (wasLiked ? -1 : 1)
      ),
    }));

    // إرسال التفاعل للسيرفر
    sendEngagement(
      postId,
      wasLiked ? "unlike" : "like"
    );
  },
  [user?.id, feed, likedPosts, likesCount, sendEngagement]
);

  const handleComment = useCallback((postId) => {
    // Toggle inline comments for this card; collapses any other card's section.
    setActiveCommentId((prev) => (prev === postId ? null : postId));
  }, []);

  const handleShare = useCallback(async (item) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.content || "Post",
          text: item?.content?.slice(0, 100) || "",
          url: window.location.href,
        });
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  }, []);

  return (
    <div className="feed-container">
      <Top />
      <Sidebar />
      <InterestsPopup />

      <div className="feed-main">
        <Writer />

        <FeedList
          feed={feed}
          likedPosts={likedPosts}
          likesCount={likesCount}
          activeCommentId={activeCommentId}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          getDirection={getDirection}
          userId={user?.id}
        />

        {loading && <Loader />}

        {error && (
          <div className="feed-error-container" style={{ textAlign: "center", padding: "16px" }}>
            <p style={{ color: "#ef4444", marginBottom: "8px" }}>{error}</p>
            <button
              onClick={() => fetchFeed(feed.length === 0)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                cursor: "pointer",
              }}
            >
              إعادة المحاولة / Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Feed);
