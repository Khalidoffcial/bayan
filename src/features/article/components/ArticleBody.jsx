import React from "react";
import ContentTranslation from "../../../components/common/ContentTranslation";
import {
  AdSenseInArticle,
  splitContentForInArticleAd,
} from "../../ads/AdSenseInArticle";

/**
 * ArticleBody — unified reading body for articles AND novels (/r/:id).
 *
 * The AdSense In-Article unit is placed between whole content blocks
 * (never inside a paragraph), roughly after the 3rd–4th block. Short
 * content renders with no ad. The split is memoized per content string
 * so re-renders never produce a different insertion point.
 */
export const ArticleBody = ({ content, imageUrl, contentDir, articleRef, contentId, contentType }) => {
  const segments = React.useMemo(
    () => splitContentForInArticleAd(content),
    [content]
  );

  return (
    <div className="article-body" ref={articleRef} dir={contentDir}>
      {imageUrl && (
        <div className="main-image">
          <img src={imageUrl} alt="Article Main" />
        </div>
      )}
      <div
        className="content-text"
        dangerouslySetInnerHTML={{ __html: segments.showAd ? segments.headHtml : (content || "") }}
      />
      {segments.showAd && <AdSenseInArticle />}
      {segments.showAd && (
        <div
          className="content-text"
          dangerouslySetInnerHTML={{ __html: segments.tailHtml }}
        />
      )}
      {/* خيار الترجمة أسفل المحتوى الأصلي — المقالات تحتفظ بتنسيقها وروابطها */}
      <ContentTranslation contentId={contentId} contentType={contentType} content={content} />
    </div>
  );
};

export default React.memo(ArticleBody);
