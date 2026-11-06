import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";

// Writer (inline composer)
import Writer from "../../writer/components/Writer";

// Hooks & Utils
import useAuth from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useFeed from "../hooks/useFeed";
import { getDirection } from "../../../utils/helpers";
import { FEED_PREFETCH_THRESHOLD_PX } from "../../../constants/feedConfig";
import { feedStore } from "../services/feedStore";

// Shared Layout & UI Components
import Loader from "../../../components/ui/Loader";

// Feature Components
import FeedList from "./FeedList";
import "../styles/feed.css";

export const Feed = () => {
  const { typeArticle } = useParams();
  const location = useLocation();
  const { user } = useAuth();
    const navigate = useNavigate();
  
  // المسار → نوع الخلاصة المطلوب من الخادم:
  //   /            → "all" (Posts + Articles + Novels) — المسار الرئيسي الوحيد للـ All
  //   /posts       → "posts"
  //   /articles    → "articles"
  //   /novels      → "novels"
  //   (/all يعاد توجيهه إلى / في AppRoutes — لا نسخة ثانية من الـ Feed)
  const feedType = typeArticle ? String(typeArticle).toLowerCase() : "all";

  const {
    feed,
    loading,
    hasMore,
    error,
    fetchFeed,
    sendEngagement,
    removePost

  } = useFeed(feedType, user?.id);

  // Local UI State
  const [likedPosts, setLikedPosts] = useState({});
  const [likesCount, setLikesCount] = useState({});
  // Inline comments: single expanded section at a time (null = all collapsed).
  const [activeCommentId, setActiveCommentId] = useState(null);

  // Scroll restoration: save while mounted, restore after items render.
  // Only ONE restore per mount (prevents visual jumping on later loads),
  // and only when the layout has enough content to scroll to.
  const didRestoreScroll = useRef(false);

  useEffect(() => {
    didRestoreScroll.current = false;

    const save = () => {
      feedStore.setScroll(feedType, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });

    return () => {
      window.removeEventListener("scroll", save);
    };
  }, [feedType]);

  useEffect(() => {
    if (didRestoreScroll.current) return;
    const savedY = feedStore.getScroll(feedType);
    if (!savedY) return;

    // Wait until the cached items are actually rendered before restoring —
    // restoring earlier would clamp to a shorter document and lose position.
    const raf = requestAnimationFrame(() => {
      if (document.documentElement.scrollHeight > savedY + window.innerHeight) {
        window.scrollTo({ top: savedY, behavior: "instant" });
        didRestoreScroll.current = true;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [feedType, feed]);

  // NOTE: no resetFeed + refetch on pathname change — the store keeps the
  // feed alive across navigate-to-content-and-back; useFeed hydrates from
  // cache instantly and only refreshes after the staleness window.

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
      {/* Chrome (Top/Sidebar/InterestsPopup) and the ad rail belong to
          AppLayout — the Feed is pure content composition. */}
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
          onPostDeleted={removePost}
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
