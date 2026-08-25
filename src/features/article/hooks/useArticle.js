import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { exportArticleToPDF, shareArticle } from "../services/article.service";

export const useArticle = () => {
  const { articleId } = useParams();
  const location = useLocation();
  const articleRef = useRef(null);

  const [dataArticle, setDataArticle] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commented, setCommented] = useState(false);

  useEffect(() => {
    if (location.state) {
      setDataArticle(location.state);
      if (location.state?.img?.length > 0) {
        setImageUrl(location.state.img[0]);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [articleId, location.state]);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleDownloadPDF = () => {
    if (articleRef.current) {
      exportArticleToPDF(articleRef.current, dataArticle?.title);
    }
  };

  const handleShare = () => {
    shareArticle({
      title: dataArticle?.title,
      url: window.location.href,
    });
  };

  return {
    articleId,
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
  };
};

export default useArticle;
