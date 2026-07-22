import React from 'react';
import ArticleBox from './articleBox.jsx';
import QuoteSlider from "./wise.jsx"
import Writer from "./writer.jsx"


const content = () => {
  return (<>
  <div className="content">
      <QuoteSlider/>
      <ArticleBox />
      <Writer />

  </div>
  </>
  )
}

export default content