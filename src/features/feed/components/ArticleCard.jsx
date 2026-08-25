import React from "react";
import { useNavigate } from "react-router-dom";
import FeedUser from "./FeedUser";

export const ArticleCard = ({ item }) => {
  const navigate = useNavigate();

  return (
    <div
      className="article-content"
      onClick={() => navigate(`/r/${item.id}`, { state: item })}
    >
      <h1>{item.title}</h1>
      <p className="descrip">{item.descrip}</p>
      <FeedUser userData={item.userData} />
    </div>
  );
};

export default React.memo(ArticleCard);
