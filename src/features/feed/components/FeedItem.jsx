import React from "react";
import PostCard from "./PostCard";
import ArticleCard from "./ArticleCard";

/**
 * Resolves an item's display kind defensively — legacy records may carry
 * `type: "articles"/"novels"/"post"`, unified records may carry `kind`.
 */
const resolveKind = (item) => {
  const raw = String(item.kind || item.type || "").toLowerCase().trim();
  if (raw.startsWith("article")) return "article";
  if (raw.startsWith("novel")) return "novel";
  return "post";
};

export const FeedItem = ({
  item,
  liked,
  likesCount,
  commentsOpen = false,
  onLike,
  onComment,
  onShare,
  getDirection,
  onDeleted,
}) => {
  if (!item) return null;

  const kind = resolveKind(item);
  const isPost = kind === "post";
  const commentsCount = Number(item.commentsCount ?? item.comments ?? item.comments_count ?? 0) || 0;

  return (
    <div className={isPost ? "bayan-card bayan-card--post" : ""}>
      {isPost ? (
        <PostCard
          item={item}
          liked={liked}
          likesCount={likesCount}
          commentsCount={commentsCount}
          commentsOpen={commentsOpen}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          getDirection={getDirection}
          onDeleted={onDeleted}
        />
      ) : (
        <ArticleCard item={item} kind={kind} onShare={onShare} />
      )}
    </div>
  );
};

export default React.memo(FeedItem);
