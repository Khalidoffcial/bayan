import React from "react";
import AppLayout from "../components/layout/AppLayout";
import ArticleReading from "../features/article/components/ArticleReading";

/** ArticlePage — /r/:id. AppLayout owns chrome; reading owns its column. */
export const ArticlePage = () => {
  return (
    <AppLayout>
      <ArticleReading />
    </AppLayout>
  );
};

export default React.memo(ArticlePage);
