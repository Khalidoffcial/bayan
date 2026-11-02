import React from "react";
import { Helmet } from "react-helmet-async";

export const ArticleHeader = ({ title, descrip, imageUrl, titleDir, authorName, datePublished, dateModified }) => {
  const canonicalUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  // لا بيانات وهمية — الحقول الفارغة تُحذف تمامًا من Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    ...(descrip ? { description: descrip } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(authorName ? { author: { "@type": "Person", name: authorName } } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(canonicalUrl ? { mainEntityOfPage: canonicalUrl } : {}),
    publisher: { "@type": "Organization", name: "Bayan Space" },
  };

  return (
    <>
      <Helmet>
        <title>{title || "Article"} | Bayan Space</title>
        {descrip && <meta name="description" content={descrip} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={descrip} />
        <meta property="og:type" content="article" />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="article-header-ui" dir={titleDir}>
        <h1>{title}</h1>
        <p className="description">{descrip}</p>
      </div>
    </>
  );
};

export default React.memo(ArticleHeader);
