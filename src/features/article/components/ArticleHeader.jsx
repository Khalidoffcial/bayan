import React from "react";
import { Helmet } from "react-helmet-async";

export const ArticleHeader = ({ title, descrip, imageUrl, titleDir }) => {
  return (
    <>
      <Helmet>
        <title>{title || "Article"}</title>
        <meta name="description" content={descrip || "Article Description"} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={descrip} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="article-header-ui" dir={titleDir}>
        <h1>{title}</h1>
        <p className="description">{descrip}</p>
      </div>
    </>
  );
};

export default React.memo(ArticleHeader);
