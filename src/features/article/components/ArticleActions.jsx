import React from "react";
import {
  Heart as HeartIcon, MessageCircle as CommentIcon,
  Share2 as ShareIcon, FileDown as PdfIcon,
} from "lucide-react";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";
import { useTranslation } from "../../../i18n/useTranslation";

export const ArticleActions = ({
  liked,
  likesCount,
  onLike,
  onComment,
  onShare,
  onDownloadPDF,
  article,
}) => {
  const { t } = useTranslation();
  return (
    <div className="article-actions">
      <button
        className={`action-btn like ${liked ? "active" : ""}`}
        onClick={onLike}
        aria-label={t("article.like")}
      >
        <HeartIcon size={17} strokeWidth={liked ? 2.5 : 2} fill={liked ? "currentColor" : "none"} />
        <span>{likesCount}</span>
      </button>

      <button
        className="action-btn comment"
        onClick={onComment}
        aria-label={t("article.comment")}
      >
        <CommentIcon size={17} strokeWidth={2} />
      </button>

      <button
        className="action-btn share"
        onClick={onShare}
        aria-label={t("article.share")}
      >
        <ShareIcon size={17} strokeWidth={2} />
      </button>

      {/* اقرأها لاحقًا — يُحفظ في قاعدة بيانات المستخدم، ويزول عند الضغط تاني */}
      {article?.id && (
        <ReadLaterButton
          contentId={article.id}
          contentType={article.type || "articles"}
          title={article.title}
          image={Array.isArray(article.img) ? article.img[0] : article.img}
        />
      )}

      <button
        className="action-btn pdf"
        onClick={onDownloadPDF}
        aria-label={t("article.downloadPdf")}
      >
        <PdfIcon size={17} strokeWidth={2} /> <span>PDF</span>
      </button>
    </div>
  );
};

export default React.memo(ArticleActions);
