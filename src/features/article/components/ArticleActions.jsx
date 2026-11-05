import React from "react";
import { FaHeart, FaComment, FaShareAlt, FaFilePdf } from "react-icons/fa";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";

export const ArticleActions = ({
  liked,
  likesCount,
  onLike,
  onComment,
  onShare,
  onDownloadPDF,
  article,
}) => {
  return (
    <div className="article-actions">
      <button
        className={`action-btn like ${liked ? "active" : ""}`}
        onClick={onLike}
        aria-label="Like article"
      >
        <FaHeart /> <span>{likesCount}</span>
      </button>

      <button
        className="action-btn comment"
        onClick={onComment}
        aria-label="Comment on article"
      >
        <FaComment />
      </button>

      <button
        className="action-btn share"
        onClick={onShare}
        aria-label="Share article"
      >
        <FaShareAlt />
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
        aria-label="Download article as PDF"
      >
        <FaFilePdf /> PDF
      </button>
    </div>
  );
};

export default React.memo(ArticleActions);
