import React from "react";
import ContentTranslation from "../../../components/common/ContentTranslation";

export const ArticleBody = ({ content, imageUrl, contentDir, articleRef, contentId, contentType }) => {
  return (
    <div className="article-body" ref={articleRef} dir={contentDir}>
      {imageUrl && (
        <div className="main-image">
          <img src={imageUrl} alt="Article Main" />
        </div>
      )}
      <div
        className="content-text"
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
      {/* خيار الترجمة أسفل المحتوى الأصلي — المقالات تحتفظ بتنسيقها وروابطها */}
      <ContentTranslation contentId={contentId} contentType={contentType} content={content} />
    </div>
  );
};

export default React.memo(ArticleBody);
