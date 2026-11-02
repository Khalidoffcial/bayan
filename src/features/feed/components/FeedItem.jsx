import React from "react";
import { motion } from "framer-motion";
import PostCard from "./PostCard";
import ArticleCard from "./ArticleCard";

const KIND_LABELS = {
  article: "مقال",
  novel: "رواية",
};

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
    <motion.div
      key={item.id}
      className={isPost ? "BottomBox" : "box"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isPost && (
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
      )}

      {!isPost && <ArticleCard item={item} kind={kind} />}
    </motion.div>
  );
};

export default React.memo(FeedItem);
