import React from 'react';
import Feed from '../../features/feed/components/Feed';
import QuoteSlider from "../common/QuoteSlider";
import Writer from "../../features/writer/components/Writer";

export const Content = () => {
  return (
    <div className="content">
      <QuoteSlider />
      <Feed />
      <Writer />
    </div>
  );
};

export default React.memo(Content);

