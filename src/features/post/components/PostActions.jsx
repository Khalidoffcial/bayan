import React from "react";
import { FaHeart, FaComment, FaShareAlt } from "react-icons/fa";

export const PostActions = ({ liked, likesCount, onLike, onComment, onShare }) => {
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
    </div>
  );
};

export default React.memo(PostActions);
