import React from "react";
import { useNavigate } from "react-router-dom";
import ViewCounter from "../../../components/common/ViewCounter";
import FeedUser from "./FeedUser";

const KIND_LABELS = {
  article: "مقال",
  novel: "رواية",
};

/**
 * ArticleCard — renders articles AND novels in their original record shape
 * (title, cover, descrip, author, date). `kind` selects the badge label and
 * the reading route: articles → /r/{id}, novels → /r/{id} as well (the
 * existing unified reading mechanism).
 */
export const ArticleCard = ({ item, kind }) => {
  const navigate = useNavigate();

  const resolvedKind =
    kind || (String(item?.type || "").toLowerCase().startsWith("novel") ? "novel" : "article");
  const label = KIND_LABELS[resolvedKind] || "مقال";
  const cover =
    (Array.isArray(item?.img) && item.img[0]) ||
    (typeof item?.img === "string" && item.img) ||
    null;

  return (
    <div
      className="article-content"
      onClick={() => navigate(`/r/${item.id}`, { state: item })}
    >
      <span className={`article-kind-badge article-kind-badge--${resolvedKind}`}>
        {label}
      </span>
      {cover && (
        <img className="article-cover" src={cover} alt={item.title || ""} loading="lazy" />
      )}
      <h1>{item.title}</h1>
      <p className="descrip">{item.descrip}</p>
      <div className="article-meta-row">
        {item.date && <span className="article-date">{item.date}</span>}
        <ViewCounter
          contentId={item.id}
          contentType={item.type === "novels" ? "novels" : "articles"}
          initialViews={item.views}
        />
      </div>
      <FeedUser userData={item.userData} />
    </div>
  );
};

export default React.memo(ArticleCard);
