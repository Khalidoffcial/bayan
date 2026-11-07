import React from "react";
import {
  Heart as HeartIcon, MessageCircle as CommentIcon,
  Share2 as ShareIcon,
} from "lucide-react";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";
import { useTranslation } from "../../../i18n/useTranslation";

export const PostActions = ({ liked, likesCount, onLike, onComment, onShare, extraStats, post }) => {
  const { t } = useTranslation();
  return (
    <div className="post-actions">
      <button
        className={`action-btn like ${liked ? "active" : ""}`}
        onClick={onLike}
        aria-label={t("post.like")}
      >
        <HeartIcon size={17} strokeWidth={liked ? 2.5 : 2} fill={liked ? "currentColor" : "none"} />
        <span>{likesCount}</span>
      </button>

      <button
        className="action-btn comment"
        onClick={onComment}
        aria-label={t("post.comment")}
      >
        <CommentIcon size={17} strokeWidth={2} />
      </button>

      <button
        className="action-btn share"
        onClick={onShare}
        aria-label={t("post.share")}
      >
        <ShareIcon size={17} strokeWidth={2} />
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
