import React from "react";
import { FaHeart, FaComment, FaShareAlt } from "react-icons/fa";

export const FeedActions = ({
  itemId,
  liked,
  likesCount,
  onLike,
  onComment,
  onShare,
}) => {
  return (
    <div className="actions">
      <button
        className="like_action"
        onClick={() => onLike(itemId)}
        style={{ color: liked ? "#d30000" : "#333" }}
        aria-label="Like"
      >
        <FaHeart />
        <span>{likesCount || 0}</span>
      </button>

      <button
        className="comment_action"
        onClick={onComment}
        aria-label="Comment"
      >
        <FaComment />
      </button>

      <button
        className="share_action"
        onClick={onShare}
        aria-label="Share"
      >
        <FaShareAlt />
      </button>
    </div>
  );
};

export default React.memo(FeedActions);
