import React from "react";
import { FaHeart, FaComment, FaShareAlt } from "react-icons/fa";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";

export const PostActions = ({ liked, likesCount, onLike, onComment, onShare, extraStats, post }) => {
  return (
    <div className="post-actions">
      <button
        className={`action-btn like ${liked ? "active" : ""}`}
        onClick={onLike}
        aria-label="Like post"
      >
        <FaHeart /> <span>{likesCount}</span>
      </button>

      <button
        className="action-btn comment"
        onClick={onComment}
        aria-label="Comment on post"
      >
        <FaComment />
      </button>

      <button
        className="action-btn share"
        onClick={onShare}
        aria-label="Share post"
      >
        <FaShareAlt />
      </button>

      {/* اقرأها لاحقًا — حفظ/إزالة في قاعدة بيانات المستخدم */}
      {post?.id && (
        <ReadLaterButton
          contentId={post.id}
          contentType="posts"
          title={(post.content || "").slice(0, 80)}
          image={Array.isArray(post.img) ? post.img[0] : post.img}
        />
      )}

      {/* عداد المشاهدات — عنصر عرض فقط، غير قابل للنقر */}
      {extraStats && <div className="post-actions__extra">{extraStats}</div>}
    </div>
  );
};

export default React.memo(PostActions);
