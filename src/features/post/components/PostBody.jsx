import React from "react";
import ContentTranslation from "../../../components/common/ContentTranslation";

export const PostBody = ({ content, imageUrl, contentDir, contentId, contentType }) => {
  return (
    <div className="post-body" dir={contentDir}>
      <div
        className="post-content-text"
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
      {imageUrl && (
        <div className="post-image">
          <img src={imageUrl} alt="Post Content" />
        </div>
      )}
      {/* خيار الترجمة يظهر أسفل الأصل فقط عند طلب المستخدم — لا ترجمة تلقائية */}
      <ContentTranslation contentId={contentId} contentType={contentType} content={content} />
    </div>
  );
};

export default React.memo(PostBody);
