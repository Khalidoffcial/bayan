import React from "react";
import { useNavigate } from "react-router-dom";
import Top from "../../../components/layout/Top";
import CommentModal from "../../../components/common/CommentModal";
import Loader from "../../../components/ui/Loader";
import ArticleHeader from "./ArticleHeader";
import ArticleBody from "./ArticleBody";
import ArticleActions from "./ArticleActions";
import useArticle from "../hooks/useArticle";
import useAuth from "../../../hooks/useAuth";
import { getDirection } from "../../../utils/helpers";
import "../styles/article.css";

export const ArticleReading = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    dataArticle,
    imageUrl,
    loading,
    liked,
    likesCount,
    commented,
    setCommented,
    articleRef,
    handleLike,
    handleDownloadPDF,
    handleShare,
  } = useArticle();

  if (loading) {
    return (
      <div className="article-reading-container">
        <Top />
        <div className="loading"><Loader /></div>
      </div>
    );
  }

  if (!dataArticle) {
    return (
      <div className="article-reading-container">
        <Top />
        <div className="loading"><h1>Article not found</h1></div>
      </div>
    );
  }

  return (
    <div className="article-reading-container">
      <Top />

      <div className="article-reading-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <ArticleHeader
          title={dataArticle.title}
          descrip={dataArticle.descrip}
          imageUrl={imageUrl}
          titleDir={getDirection(dataArticle.title)}
        />

        <ArticleBody
          content={dataArticle.content}
          imageUrl={imageUrl}
          contentDir={getDirection(dataArticle.content)}
          articleRef={articleRef}
        />

        <ArticleActions
          liked={liked}
          likesCount={likesCount}
          onLike={handleLike}
          onComment={() => setCommented(true)}
          onShare={handleShare}
          onDownloadPDF={handleDownloadPDF}
        />
      </div>

      <CommentModal
        isOpen={commented}
        onClose={() => setCommented(false)}
        commentOnId={dataArticle.id}
        userId={user?.id}
      />
    </div>
  );
};

export default React.memo(ArticleReading);
