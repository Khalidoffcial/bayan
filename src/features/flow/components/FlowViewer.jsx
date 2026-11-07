/**
 * FlowViewer — the Bayan Flow experience shell.
 *
 * Gesture strategy (deliberately NOT hand-rolled):
 *   A CSS scroll-snap container (`scroll-snap-type: y mandatory`) with
 *   `scroll-snap-stop: always` per card. The browser's native scroller
 *   handles touch swipe, trackpad, mouse wheel and keyboard scrolling
 *   with proper physics and nested-scroll rules — no fragile custom
 *   touch math, no accidental navigation over buttons/links/text
 *   selection (the browser already keeps interactive elements scroll-
 *   neutral). Active index is derived from an IntersectionObserver.
 *
 * Memory discipline: only a window of ±1 cards mounts real content
 * (visible + adjacent preload); the rest render a lightweight skeleton
 * placeholder. Media obeys `active` — videos pause/rewind off-screen.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw as RefreshIcon,
  ChevronUp as UpIcon,
  ChevronDown as DownIcon,
  WifiOff as OfflineIcon,
} from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import useAuth from "../../../hooks/useAuth";
import useSocket from "../../../hooks/useSocket";
import { useFlowFeed } from "../services/flow.service";
import { emitPostEngagement } from "../../feed/services/feed.service";
import { followUser, unfollowUser } from "../../../features/profile/services/profile.service";
import FlowItem from "./FlowItem";
import ShareSheet from "../../feed/components/ShareSheet";
import Loader from "../../../components/ui/Loader";
import "./flow.css";

/** How many adjacent cards keep live content (1 = preload next). */
const WINDOW = 1;

/** The official section name — NEVER translated, identical in every locale. */
export const FLOW_NAME = "Bayan Flow";

export const FlowViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socketRef = useSocket();
  const { items, loading, loadingMore, error, refresh, ensureBuffer, markSeen } =
    useFlowFeed({ userId: user?.id });

  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Resume position across route leave/re-enter (module state survives).
  const lastPosition = useRef(0);

  // Jump back to where the user left off (same session, module state persists).
  useEffect(() => {
    if (items.length && lastPosition.current > 0 && lastPosition.current < items.length) {
      const target = lastPosition.current;
      lastPosition.current = 0;
      requestAnimationFrame(() => {
        const el = cardRefs.current[target];
        if (el) el.scrollIntoView({ block: "start" });
        setActiveIndex(target);
      });
    }
  }, [items]);

  // Reduced motion preference (drives smooth scrolling + video autoplay).
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Persist resume position on unmount (restore next visit this session).
  useEffect(() => {
    return () => {
      if (activeIndex > 0) lastPosition.current = activeIndex;
    };
  }, [activeIndex]);

  /* ---------------- active-index tracking ---------------- */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number(entry.target.dataset.index);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
              ensureBuffer(idx);
              const id = items[idx]?.id;
              if (id) markSeen(id);
            }
          }
        }
      },
      { root, threshold: [0.6] }
    );

    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items, ensureBuffer, markSeen]);

  /* ---------------- keyboard navigation (desktop a11y) ---------------- */
  const goTo = useCallback(
    (index, behavior) => {
      const el = cardRefs.current[index];
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      cardRefs.current[clamped]?.scrollIntoView({
        behavior: behavior || (reducedMotion ? "auto" : "smooth"),
        block: "start",
      });
      setActiveIndex(clamped);
},
[items.length, reducedMotion]
  );

useEffect(() => {
  const root = containerRef.current;
  if (!root) return undefined;
  const onKey = (e) => {
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goTo(activeIndex + 1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  };
  root.addEventListener("keydown", onKey);
  return () => root.removeEventListener("keydown", onKey);
}, [activeIndex, goTo]);

/* ---------------- engagement state (mirrors Feed.jsx logic) -------- */
const [likedPosts, setLikedPosts] = useState({});
const [likesCount, setLikesCount] = useState({});
const [commentsOpenId, setCommentsOpenId] = useState(null);
const [shareItem, setShareItem] = useState(null);
const [followState, setFollowState] = useState({});
const [followBusy, setFollowBusy] = useState(false);

const handleLike = useCallback(
  (postId) => {
    if (!user?.id || !postId) return;
    const post = items.find((i) => String(i.id) === String(postId));
    if (!post) return;

    const wasLiked = likedPosts[postId] ?? Boolean(post.likesBy?.[user.id]);
    const currentCount = Number(likesCount[postId] ?? post.likesCount ?? post.likes ?? 0);

    setLikedPosts((p) => ({ ...p, [postId]: !wasLiked }));
    setLikesCount((p) => ({ ...p, [postId]: Math.max(0, currentCount + (wasLiked ? -1 : 1)) }));

    emitPostEngagement(socketRef.current, {
      contentId: postId,
      userId: user.id,
      type: wasLiked ? "unlike" : "like",
    });
  },
  [user?.id, items, likedPosts, likesCount, socketRef]
);

const handleComment = useCallback((postId) => {
  setCommentsOpenId((prev) => (prev === postId ? null : postId));
}, []);

const handleShare = useCallback((item) => setShareItem(item), []);

const handleFollow = useCallback(
  async (item) => {
    const targetId = item?.autherID || item?.userData?.Id_user;
    if (!user?.id || !targetId || followBusy) return;
    const wasFollowing = followState[targetId] ?? false;
    setFollowBusy(true);
    // Server-first (same policy as useProfile: no fake success).
    try {
      if (wasFollowing) {
        await unfollowUser(user.id, targetId);
      } else {
        await followUser(user.id, targetId);
      }
      setFollowState((p) => ({ ...p, [targetId]: !wasFollowing }));
    } catch {
      /* button stays in previous state — no fake feedback */
    } finally {
      setFollowBusy(false);
    }
  },
  [user?.id, followState, followBusy]
);

/* ---------------- render ---------------- */
const windowedItems = useMemo(
  () =>
    items.map((item, i) => ({
      item,
      index: i,
      mounted: Math.abs(i - activeIndex) <= WINDOW,
    })),
  [items, activeIndex]
);

if (loading && !items.length) {
  return (
    <div className="flow" role="status" aria-live="polite">
      <div className="flow-skeleton">
        <Loader />
        <span className="flow-tagline">{t("flow.tagline")}</span>
      </div>
    </div>
  );
}

return (
  <div className="flow" data-flow-root>
    <div className="flow__topbar">
      <span className="flow__brand" dir="auto">{FLOW_NAME}</span>
      <button
        type="button"
        className="flow__refresh"
        onClick={() => refresh()}
        disabled={loadingMore}
        aria-label={t("flow.refresh")}
      >
        <RefreshIcon size={17} className={loadingMore ? "spin" : undefined} />
      </button>
    </div>

    {error && !items.length ? (
      <div className="flow-error" role="alert">
        <OfflineIcon size={22} aria-hidden />
        <p>{t("feed.error")}</p>
        <button type="button" onClick={() => refresh()}>{t("feed.retry")}</button>
      </div>
    ) : (
      <div
        className="flow__track"
        ref={containerRef}
        tabIndex={0}
        aria-label={FLOW_NAME}
        role="region"
      >
        {windowedItems.map(({ item, index, mounted }) => (
          <div
            key={item.id}
            data-index={index}
            ref={(el) => { cardRefs.current[index] = el; }}
            className="flow__cell"
          >
            {mounted ? (
              <FlowItem
                item={item}
                active={index === activeIndex}
                reducedMotion={reducedMotion}
                liked={likedPosts[item.id] ?? Boolean(item.likesBy?.[user?.id])}
                likesCount={likesCount[item.id] ?? item.likesCount ?? item.likes}
                commentsCount={item.replyCount ?? item.commentsCount}
                commentsOpen={commentsOpenId === item.id}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onFollow={handleFollow}
                following={followState[item.autherID || item.userData?.Id_user]}
                followingBusy={followBusy}
              />
            ) : (
              <div className="flow__placeholder" aria-hidden />
            )}
          </div>
        ))}

        {/* Empty state — distinct from error: server answered, zero content.
            Shown only after loading completes (never before). */}
        {!items.length && !error && !loading && (
          <div className="flow-empty">
            <p>{t("flow.empty")}</p>
            <button type="button" className="flow-empty__retry" onClick={() => refresh()}>
              {t("feed.retry")}
            </button>
          </div>
        )}
      </div>
    )}

    {/* Accessible navigation controls (gesture-free fallback) */}
    <div className="flow__navbtns">
      <button
        type="button"
        className="flow__navbtn"
        onClick={() => goTo(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label={t("flow.prev")}
      >
        <UpIcon size={20} />
      </button>
      <button
        type="button"
        className="flow__navbtn"
        onClick={() => goTo(activeIndex + 1)}
        disabled={activeIndex >= items.length - 1 && !loadingMore}
        aria-label={t("flow.next")}
      >
        <DownIcon size={20} />
      </button>
    </div>

    <ShareSheet open={Boolean(shareItem)} item={shareItem} onClose={() => setShareItem(null)} />
  </div>
);
};

export default FlowViewer;
