/**
 * FlowItem — the full-screen presentation of one item, variant per kind.
 *
 * Presentation reuses REAL Bayan components wherever possible:
 *   - MediaGallery for post media (same layouts/lightbox as the feed);
 *   - FeedUser for author identity (same avatar/name/profile nav);
 *   - ReadLaterButton for save (same savedContent service, no dup logic);
 *   - InlineComments for the comment thread (same post service).
 * Articles/novels show a curated excerpt card with "Continue Reading"
 * opening the EXISTING reader at /r/:id — no second reader is built.
 *
 * Interaction safety: every button/link calls e.stopPropagation() so
 * the vertical-swipe gesture never misfires on interactive elements.
 */
import React, { memo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  Share2 as ShareIcon,
  User as UserIcon,
  BookOpen as ReadIcon,
  ChevronDown as ExpandIcon,
  ChevronUp as CollapseIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
} from "lucide-react";
import MediaGallery from "../../../components/common/MediaGallery";
import InlineComments from "../../../components/common/InlineComments";
import FeedUser from "../../feed/components/FeedUser";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";
import { useTranslation } from "../../../i18n/useTranslation";
import useAuth from "../../../hooks/useAuth";
import { cloudinaryFeedUrl } from "../../../services/media.service";
import "./flow.css";

/** Stable compact counter (1.2K style) — same visual grammar as PostCard. */
const compact = (n) => {
  if (!Number(n)) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

/** Arabic-script detection mirrors the feed's getDirection behavior. */
const isArabic = (text) =>
  Boolean(text && /[\u0600-\u06FF\u0750-\u077F]/.test(String(text)));

/* ------------------------------------------------------------------ */
/* FlowActions — vertical action rail (visual-left in RTL via CSS).    */
/* Handlers come from the parent — the SAME logic the Feed uses.       */
/* ------------------------------------------------------------------ */
const FlowActions = ({
  item,
  liked,
  likesCount,
  commentsCount,
  onLike,
  onComment,
  onShare,
  onFollow,
  following,
  followingBusy,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn?.(e);
  };

  const isOwn = String(item?.autherID ?? "") === String(user?.id ?? "");
  const authorId = item?.autherID || item?.userData?.Id_user;

  return (
    <div className="flow-actions" role="toolbar" aria-label={t("flow.actions")}>
      <button
        type="button"
        className={`flow-act ${liked ? "flow-act--liked" : ""}`}
        onClick={stop(() => onLike?.(item.id))}
        aria-label={t("feed.like")}
        aria-pressed={Boolean(liked)}
      >
        <HeartIcon strokeWidth={liked ? 2.6 : 2} fill={liked ? "currentColor" : "none"} />
        {Boolean(likesCount) && <span className="flow-act-count">{compact(likesCount)}</span>}
      </button>

      <button
        type="button"
        className="flow-act"
        onClick={stop(() => onComment?.(item.id))}
        aria-label={t("feed.comment")}
      >
        <CommentIcon strokeWidth={2} />
        {Boolean(commentsCount) && <span className="flow-act-count">{compact(commentsCount)}</span>}
      </button>

      <ReadLaterButton
        compact
        contentId={item.id}
        contentType={
          item._kind === "article" ? "articles" : item._kind === "novel" ? "novels" : "posts"
        }
        title={(item.title || item.content || "").slice(0, 80)}
        className="flow-act"
      />

      <button
        type="button"
        className="flow-act"
        onClick={stop(() => onShare?.(item))}
        aria-label={t("share.title")}
      >
        <ShareIcon strokeWidth={2} />
      </button>

      {!isOwn && authorId && (
        <button
          type="button"
          className={`flow-follow ${following ? "flow-follow--on" : ""}`}
          onClick={stop(() => onFollow?.(item))}
          disabled={followingBusy}
          aria-pressed={Boolean(following)}
        >
          {following ? t("flow.following") : t("flow.follow")}
        </button>
      )}

      {authorId && (
        <button
          type="button"
          className="flow-act flow-act--profile"
          onClick={stop(() => navigate(`/p/${authorId}`))}
          aria-label={t("flow.viewProfile")}
        >
          <UserIcon strokeWidth={2} />
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* FlowTextPost — text with expand/collapse for long content.          */
/* ------------------------------------------------------------------ */
const FlowTextPost = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef(null);
  const dir = isArabic(item.content) ? "rtl" : "ltr";

  useEffect(() => {
    // Detect real overflow once rendered — only then show the toggle.
    if (bodyRef.current) {
      setOverflows(bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 4);
    }
  }, [item.content]);

  return (
    <div className="flow-text" dir={dir}>
      <div
        ref={bodyRef}
        className={`flow-text__body ${expanded ? "" : "flow-text__body--clamped"}`}
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />
      {overflows && (
        <button
          type="button"
          className="flow-text__toggle"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? undefined : undefined}
        >
          {expanded ? <CollapseIcon size={15} /> : <ExpandIcon size={15} />}
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* FlowMediaPost — full-bleed image/video presentation.                */
/* ------------------------------------------------------------------ */
const FlowMediaPost = ({ item, active, reducedMotion }) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const media = Array.isArray(item.media) ? item.media : [];
  const video = media.find((m) => m?.kind === "video" && m?.url);
  const images = media.filter((m) => m?.kind !== "video" && m?.url);
  const legacyImg = !media.length && item.img?.length ? item.img : null;

  // Autoplay ONLY while this card is active; pause + rewind otherwise.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    if (active && !reducedMotion) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
      try { v.currentTime = 0; } catch { /* not ready */ }
    }
    return undefined;
  }, [active, reducedMotion]);

  return (
    <div className="flow-media">
      {video ? (
        <div className="flow-media__stage">
          <video
            ref={videoRef}
            src={cloudinaryFeedUrl(video.url)}
            className="flow-media__video"
            playsInline
            muted={muted}
            loop
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flow-media__controls">
            <button
              type="button"
              className="flow-media__ctl"
              onClick={(e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
              }}
              aria-label={playing ? t("flow.pause") : t("flow.play")}
            >
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>
            <button
              type="button"
              className="flow-media__ctl"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              aria-label={muted ? t("flow.unmute") : t("flow.mute")}
            >
              {muted ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
            </button>
          </div>
        </div>
      ) : (images.length || legacyImg) ? (
        <div className="flow-media__stage flow-media__stage--img">
          <MediaGallery media={images} img={legacyImg} />
        </div>
      ) : null}

      {item.content && (
        <div className="flow-media__caption">
          <FlowTextPost item={item} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* FlowArticleCard — articles & novels: excerpt + Continue Reading.    */
/* Opens the EXISTING reader route — never a second reader.            */
/* ------------------------------------------------------------------ */
const FlowArticleCard = ({ item }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isNovel = item._kind === "novel";
  const cover =
    (Array.isArray(item?.img) && item.img[0]) ||
    (typeof item?.img === "string" && item.img) ||
    null;

  const open = () => navigate(`/r/${item.id}`, { state: item });

  return (
    <div className={`flow-article ${isNovel ? "flow-article--novel" : ""}`} dir="auto">
      {cover && (
        <button type="button" className="flow-article__cover" onClick={(e) => { e.stopPropagation(); open(); }}>
          <img src={cover} alt="" loading="lazy" />
        </button>
      )}
      {isNovel && !cover && (
        <div className="flow-article__spine" aria-hidden>
          <span>{item.title}</span>
        </div>
      )}

      <h2 className="flow-article__title" onClick={(e) => { e.stopPropagation(); open(); }}>
        {item.title}
      </h2>

      {item.descrip && <p className="flow-article__lede" dir="auto">{item.descrip}</p>}

      {item.userData?.F_user && (
        <p className="flow-article__byline">
          {t("feed.by")} <b>{item.userData.F_user}</b>
        </p>
      )}

      <button
        type="button"
        className="flow-article__cta"
        onClick={(e) => { e.stopPropagation(); open(); }}
      >
        <ReadIcon size={16} strokeWidth={2} />
        <span>{t("flow.continueReading")}</span>
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* FlowItem — assembles one full-screen card.                          */
/* ------------------------------------------------------------------ */
export const FlowItem = ({
  item,
  active,
  reducedMotion,
  liked,
  likesCount,
  commentsCount,
  commentsOpen,
  onLike,
  onComment,
  onShare,
  onFollow,
  following,
  followingBusy,
}) => {
  const { user } = useAuth();

  if (!item) return null;

  const isMedia = item._kind === "post" && (
    (Array.isArray(item.media) && item.media.some((m) => m?.url)) ||
    (Array.isArray(item.img) && item.img.length)
  );

  return (
    <section
      className={`flow-item ${active ? "flow-item--active" : ""}`}
      aria-hidden={!active}
      aria-roledescription="slide"
    >
      {/* Content layer — full height, untouched by the action rail. */}
      <div className="flow-item__scroller">
        {item._kind === "post" ? (
          <>
            <header className="flow-item__head">
              <FeedUser userData={item.userData} variant="card" />
            </header>
            {isMedia ? (
              <FlowMediaPost item={item} active={active} reducedMotion={reducedMotion} />
            ) : (
              <FlowTextPost item={item} />
            )}
          </>
        ) : (
          <FlowArticleCard item={item} />
        )}
      </div>

      {/* Mobile author strip — fixed at the bottom over the content.
          Rendered ONLY for posts (articles/novels show the author inside
          their excerpt card, so this would duplicate it). */}
      {item._kind === "post" && (item.userData?.F_user || item.userData?.S_user) && (
        <div className="flow-author">
          <FeedUser userData={item.userData} variant="card" />
        </div>
      )}

      {/* Overlay layer — the action rail floats ABOVE the content without
          reserving layout space (position:absolute within this card). */}
      <FlowActions
        item={item}
        liked={liked}
        likesCount={likesCount}
        commentsCount={commentsCount}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onFollow={onFollow}
        following={following}
        followingBusy={followingBusy}
      />

      {commentsOpen && (
        <div className="flow-comments" onClick={(e) => e.stopPropagation()}>
          <InlineComments
            userData={user}
            commentOnId={item.id}
            contentType={item._kind === "article" ? "articles" : item._kind === "novel" ? "novels" : "posts"}
          />
        </div>
      )}
    </section>
  );
};

export default memo(FlowItem);
