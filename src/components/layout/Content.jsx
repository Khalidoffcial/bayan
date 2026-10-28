import React from 'react';
import Feed from '../../features/feed/components/Feed';
import QuoteSlider from "../common/QuoteSlider";

export const Content = () => {
  return (
    <div className="content">
      <QuoteSlider />
      <Feed />
    </div>
  );
};

export default React.memo(Content);

