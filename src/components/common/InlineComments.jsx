import React from "react";
import { FaRegPaperPlane, FaUserCircle } from "react-icons/fa";
import useCommentForm from "../../hooks/useCommentForm";
import useAuth from "../../hooks/useAuth";
import "./styles/inlineComments.css";

/**
 * InlineComments — comments section rendered directly beneath a content card
 * or reading page. Replaces the previous CommentModal experience.
 *
 * Reuses the existing comment data flow (comment.service.js + useCommentForm):
 *  - REST POST /savePosts write path
 *  - Socket.IO GET_FEED → FEED_RESULT read path
 *  - NEW_POST realtime comments (deduplicated by the hook)
 *
 * The composer is compact and social-style: avatar, auto-growing textarea,
 * Send button. Enter submits, Shift+Enter adds a newline.
 */
export const InlineComments = ({userData, commentOnId, contentType = "posts" }) => {
  const { user } = useAuth();

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
    // Inline section stays open after publishing so the new comment is visible.
    closeOnSuccess: false,
  });

  const avatarSrc =
    user?.imgProfile ||
    (user?.name || user?.F_user
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.F_user)}&background=0F8EE2&color=fff`
      : null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  // Auto-grow the textarea while typing, capped by CSS max-height.
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };

  if (!commentOnId) return null;

  return (
    <div className="inline-comments">
      <div className="inline-comments-head">
        <span className="inline-comments-title">Comments</span>
        {commentCount > 0 && <span className="inline-comments-count">{commentCount}</span>}
      </div>

      <div className="inline-comments-composer">
        <span className="inline-comments-avatar">
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <FaUserCircle />}
        </span>
        <textarea
          className="inline-comments-input"
          placeholder="Write a comment..."
          rows={1}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-label="Write a comment"
        />
        <button
          type="button"
          className="inline-comments-send"
          aria-label="Send comment"
          onClick={handleSubmit}
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

      {commentsLoading && <p className="inline-comments-state">Loading comments…</p>}

      {commentsError && !commentsLoading && (
        <div className="inline-comments-state inline-comments-state-error" role="alert">
          <p>{commentsError}</p>
          <button type="button" className="inline-comments-retry" onClick={retryLoading}>
            Try again
          </button>
        </div>
      )}

      {!commentsLoading && !commentsError && comments.length === 0 && (
        <p className="inline-comments-state">No comments yet — start the conversation.</p>
      )}

      {!commentsLoading && !commentsError && comments.length > 0 && (
        <ul className="inline-comments-list">
          {comments.map((comment) => (
            <li key={comment.id} className="inline-comments-item">
              <span className="inline-comments-avatar inline-comments-avatar-sm">
                {comment.author?.imgProfile ? (
                  <img src={comment.author.imgProfile} alt="" />
                ) : (
                  <FaUserCircle />
                )}
              </span>
              <span className="inline-comments-bubble">
                <span className="inline-comments-name">
                  {comment.author?.name || "Anonymous"}
                </span>
                {comment.text && <p className="inline-comments-text">{comment.text}</p>}
                {comment.images?.length > 0 && (
                  <span className="inline-comments-images">
                    {comment.images.map((img) => (
                      <img key={img} src={img} alt="" />
                    ))}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default React.memo(InlineComments);
