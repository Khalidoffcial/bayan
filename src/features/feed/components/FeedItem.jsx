import React from "react";
import { motion } from "framer-motion";
import PostCard from "./PostCard";
import ArticleCard from "./ArticleCard";

export const FeedItem = ({
  item,
  liked,
  likesCount,
  onLike,
  onComment,
  onShare,
  getDirection,
}) => {
  if (!item) return null;

  const isPost = item.type === "posts";
  const isNovel = item.type === "novel";
  const isArticle = item.type === "article";

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
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          getDirection={getDirection}
        />
      )}

      {(isArticle || isNovel) && (
        <ArticleCard item={item} />
      )}
    </motion.div>
  );
};

export default React.memo(FeedItem);
