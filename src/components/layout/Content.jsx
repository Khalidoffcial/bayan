import React from 'react';
import Feed from '../../features/feed/components/Feed';
import QuoteSlider from "../common/QuoteSlider";

/**
 * Content — homepage composition (semantic, no layout ownership).
 *
 * The homepage's purpose: introduce (Spotlight hero) then present content
 * (Feed). Both live inside the shared .app-content column provided by
 * AppLayout. Chrome and the ad rail belong to AppLayout, not to this file.
 *
 * The homepage is the ONLY page where the composer is rendered by the Feed
 * itself as part of the discovery experience — on other feeds (/posts, …)
 * the Feed renders without the composer (its own concern).
 */
export const Content = () => {
  return (
    <>
      <QuoteSlider />
      <Feed />
    </>
  );
};

export default React.memo(Content);
