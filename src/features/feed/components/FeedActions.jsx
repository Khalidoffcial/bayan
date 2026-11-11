import React from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
 
 
export const FeedActions = ({
  itemId,
  liked,
  likesCount,
  commentsCount = 0,
  onLike,
  onComment,
  onShare,
  extra,
}) => {
  const { t } = useTranslation();

  
  

  
  
  return (
    <div className="actions">
      <button
        className="like_action"
        onClick={() => onLike(itemId)}
        style={{ color: liked ? "#d30000" : "#333" }}
        aria-label={t("feed.like")}
      >
        <Heart size={20} strokeWidth={1.75} aria-hidden />
        <span>{likesCount || 0}</span>
      </button>

      <button
        className="comment_action"
        onClick={onComment}
        aria-label={commentsCount ? `${t("feed.comment")} (${commentsCount})` : t("feed.comment")}
      >
        <MessageCircle size={20} strokeWidth={1.75} aria-hidden />
        {commentsCount > 0 && <span>{commentsCount}</span>}
      </button>

      <button
        className="share_action"
        onClick={onShare}
        aria-label={t("feed.share")}
      >
        <Share2 size={20} strokeWidth={1.75} aria-hidden />
      </button>

      {/* اقرأها لاحقًا — extra slot from PostCard */}
      {extra}
    </div>
  );
};

export default React.memo(FeedActions);
