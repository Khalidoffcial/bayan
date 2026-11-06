import React from "react";
import AppLayout from "../components/layout/AppLayout";
import Feed from "../features/feed/components/Feed";

/**
 * FeedPage — /posts /articles /novels typed feeds.
 * AppLayout owns chrome/workspace/rail; the Feed is the page composition.
 */
export const FeedPage = () => {
  return (
    <AppLayout>
      <Feed />
    </AppLayout>
  );
};

export default React.memo(FeedPage);
