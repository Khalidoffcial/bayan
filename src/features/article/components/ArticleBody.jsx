import React from "react";

export const ArticleBody = ({ content, imageUrl, contentDir, articleRef }) => {
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
    </div>
  );
};

export default React.memo(ArticleBody);
