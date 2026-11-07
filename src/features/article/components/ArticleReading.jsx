import React from "react";
import { useNavigate } from "react-router-dom";
import InlineComments from "../../../components/common/InlineComments";
import Loader from "../../../components/ui/Loader";
import ArticleHeader from "./ArticleHeader";
import ArticleBody from "./ArticleBody";
import ArticleActions from "./ArticleActions";
import ShareSheet from "../../feed/components/ShareSheet";
import useArticle from "../hooks/useArticle";
import useAuth from "../../../hooks/useAuth";
import { getDirection } from "../../../utils/helpers";
import { useTranslation } from "../../../i18n/useTranslation";
import "../styles/article.css";

export const ArticleReading = () => {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = React.useState(false);
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
        <div className="loading"><Loader /></div>
      </div>
    );
  }

  if (!dataArticle) {
    return (
      <div className="article-reading-container">
        <div className="loading"><h1>{t("article.notFound")}</h1></div>
      </div>
    );
  }

  return (
    <div className="article-reading-container">
      <div className="article-reading-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <span aria-hidden>{dir === "rtl" ? "→" : "←"}</span> {t("common.back")}
        </button>

        <ArticleHeader
          title={dataArticle.title}
          descrip={dataArticle.descrip}
          imageUrl={imageUrl}
          titleDir={getDirection(dataArticle.title)}
          authorName={dataArticle.userData?.F_user || dataArticle.userData?.S_user}
          datePublished={dataArticle.createdAt}
          dateModified={dataArticle.updatedAt}
        />

        <ArticleBody
          content={dataArticle.content}
          imageUrl={imageUrl}
          contentDir={getDirection(dataArticle.content)}
          articleRef={articleRef}
          contentId={dataArticle.id}
          contentType="articles"
        />

        <ArticleActions
          liked={liked}
          likesCount={likesCount}
          onLike={handleLike}
          onComment={() => setCommented((prev) => !prev)}
          onShare={() => setShareOpen(true)}
          onDownloadPDF={handleDownloadPDF}
          article={dataArticle}
        />

        <ShareSheet
          open={shareOpen}
          item={dataArticle}
          onClose={() => setShareOpen(false)}
        />

        {commented && <InlineComments userData={user} commentOnId={dataArticle.id} contentType="articles" />}
      </div>
    </div>
  );
};

export default React.memo(ArticleReading);
