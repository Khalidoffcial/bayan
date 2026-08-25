import React from "react";

export const PostBody = ({ content, imageUrl, contentDir }) => {
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
    </div>
  );
};

export default React.memo(PostBody);
