import React from "react";
import { FaRegPaperPlane, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import useCommentForm from "../../hooks/useCommentForm";
import useAuth from "../../hooks/useAuth";
import { useTranslation } from "../../i18n/useTranslation";
import MediaGallery from "./MediaGallery";
import ContentTranslation from "./ContentTranslation";
import { ViewableAvatar } from "./ProfileImageViewer";
import "./styles/inlineComments.css";

/**
 * Resolves the DIRECT parent author for a reply.
 * - If the parent is itself a reply (it has its own `comment_on`), the
 *   context shows the parent reply's author, not the original root author.
 * - Otherwise falls back to the root post's author (`parentAuthor` prop).
 * Never renders a fabricated identity when no data exists.
 */
const resolveParentAuthor = (reply, fallbackAuthor) => {
  const parentIsReply = Boolean(reply._raw?.comment_on || reply._raw?.parentReply);

  if (reply._raw?.parentUserData?.S_user || reply._raw?.parentUserData?.Id_user) {
    return reply._raw.parentUserData;
  }

  if (parentIsReply) {
    // Parent reply record's own author lives on its userData — already
    // stored server-side when the parent reply was persisted.
    if (reply._raw?.parentAuthor) return reply._raw.parentAuthor;
  }

  return fallbackAuthor || null;
};

/** "ردًا على @username" — the username opens the parent author's profile. */
const ReplyContext = ({ reply, fallbackUsername, fallbackUserId, fallbackIdUser, navigate }) => {
  const { t } = useTranslation();
  const parent = resolveParentAuthor(reply, {
    username: fallbackUsername,
    Id_user: fallbackUserId ?? fallbackIdUser,
  });

  const username = parent?.username || parent?.S_user;
  const parentId = parent?.Id_user ?? parent?.id;

  if (!username && !parentId) return null;

  const handleOpenProfile = (e) => {
    e.stopPropagation();
    if (parentId) navigate(`/p/${parentId}`);
  };

  return (
    <span className="inline-comments-context">
      {t("comments.replyingTo")}{" "}
      <span
        className="inline-comments-context-link"
        onClick={handleOpenProfile}
        role="button"
        tabIndex={0}
      >
        {username ? `@${String(username).replace("@", "")}` : t("comments.unknownAuthor")}
      </span>
    </span>
  );
};

/**
 * InlineComments — reply thread rendered directly beneath a content card
 * or reading page (Twitter/X-style).
 *
 * Every reply is a first-class post:
 *  - it carries its own id, author, text, images, likes and replyCount;
 *  - clicking a reply navigates to `/rp/:replyId` — the same post details
 *    experience used by regular posts;
 *  - the parent context (`Replying to @username`) links back to the parent
 *    content when available;
 *  - replies submitted here persist through the canonical POST /saveposts
 *    reply path and broadcast via NEW_POST (deduplicated by the hook).
 */
export const InlineComments = ({ userData, commentOnId, contentType = "posts", openByDefault = false, parentAuthor }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    comments,
    commentCount,
    commentsLoading,
    commentsError,
    retryLoading,
    content,
    setContent,
    canSubmit,
    isSubmitting,
    submitError,
    handleSubmit,
  } = useCommentForm({
    userData,
    commentOnId,
    contentType,
    // Inline section stays open after publishing so the new reply is visible.
    closeOnSuccess: false,
    openByDefault,
  });

  const avatarSrc =
    user?.imgProfile ||
    (user?.name || user?.F_user
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.F_user)}&background=0F8EE2&color=fff`
      : null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) handleSubmit(user?.id);
    }
  };
 
  // Auto-grow the textarea while typing, capped by CSS max-height.
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };

  const goToReply = (reply) => {
    navigate(`/rp/${reply.id}`, {
      state: {
        ...reply._raw,
        id: reply.id,
        userData: {
          Id_user: reply.author.id,
          F_user: reply.author.name,
          S_user: reply.author.username,
          imgProfile: reply.author.imgProfile,
        },
      },
    });
  };

  if (!commentOnId) return null;

  return (
    <div className="inline-comments">
      <div className="inline-comments-head">
        <span className="inline-comments-title">{t("comments.replies")}</span>
        {commentCount > 0 && <span className="inline-comments-count">{commentCount}</span>}
      </div>

      <div className="inline-comments-composer">
        <span className="inline-comments-avatar">
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <FaUserCircle />}
        </span>
        <textarea
          className="inline-comments-input"
          placeholder={t("comments.replyPlaceholder")}
          rows={1}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-label={t("comments.writeReply")}
        />
        <button
          type="button"
          className="inline-comments-send"
          aria-label={t("comments.sendReply")}
          onClick={() => handleSubmit(user?.id)}
          disabled={!canSubmit}
        >
          {isSubmitting ? "…" : <FaRegPaperPlane />}
        </button>
      </div>

      {submitError && (
        <p className="inline-comments-error" role="alert">
          {submitError}
        </p>
      )}

      {commentsLoading && <p className="inline-comments-state">{t("comments.repliesLoading")}</p>}

      {commentsError && !commentsLoading && (
        <div className="inline-comments-state inline-comments-state-error" role="alert">
          <p>{commentsError}</p>
          <button type="button" className="inline-comments-retry" onClick={retryLoading}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!commentsLoading && !commentsError && comments.length === 0 && (
        <p className="inline-comments-state">{t("comments.repliesEmpty")}</p>
      )}

      {!commentsLoading && !commentsError && comments.length > 0 && (
        <ul className="inline-comments-list">
          {comments.map((reply) => (
            <li
              key={reply.id}
              className="inline-comments-item inline-comments-reply"
              onClick={() => goToReply(reply)}
            >
              <span className="inline-comments-avatar inline-comments-avatar-sm">
                {reply.author?.imgProfile ? (
                  <ViewableAvatar
                    src={reply.author.imgProfile}
                    alt={reply.author?.name || "User"}
                    className="inline-comments-avatar-img"
                  />
                ) : (
                  <FaUserCircle />
                )}
              </span>
              <span className="inline-comments-bubble">
                <span className="inline-comments-meta">
                  <span className="inline-comments-name">
                    {reply.author?.name || t("comments.anonymous")}
                  </span>
                  {reply.author?.username && (
                    <span className="inline-comments-username">
                      {reply.author.username.startsWith("@")
                        ? reply.author.username
                        : `@${reply.author.username}`}
                    </span>
                  )}
                </span>
                <ReplyContext
                  reply={reply}
                  fallbackUsername={parentAuthor?.username || parentAuthor?.S_user}
                  fallbackUserId={parentAuthor?.Id_user ?? parentAuthor?.id}
                  navigate={navigate}
                />
              {reply.text && (
                <>
                  <p className="inline-comments-text">{reply.text}</p>
                  {/* ترجمة الرد عند طلب المستخدم فقط — النص الأصلي يبقى كما هو */}
                  <ContentTranslation
                    contentId={reply.id}
                    contentType="posts"
                    content={reply.text}
                  />
                </>
              )}
              <MediaGallery media={reply.media} img={reply.images} />
                <span className="inline-comments-stats">
                  {reply.replyCount > 0 && (
                    <span className="inline-comments-stat">{reply.replyCount} {t("comments.repliesCount")}</span>
                  )}
                  {reply.likesCount > 0 && (
                    <span className="inline-comments-stat">{reply.likesCount} {t("comments.likesCount")}</span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default React.memo(InlineComments);
