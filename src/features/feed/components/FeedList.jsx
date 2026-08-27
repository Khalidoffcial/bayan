import React from "react";
import FeedItem from "./FeedItem";

export const FeedList = ({
  feed,
  likedPosts,
  likesCount,
  onLike,
  onComment,
  onShare,
  getDirection,
}) => {
  if (!feed || feed.length === 0) return null;

  const seenRenderKeys = new Set();

  return (
    <div className="feed-list">
      {feed.map((item, index) => {
        const rawId = item.id ?? item._id ?? item.id_post ?? `feed-item-${index}`;
        const itemId = String(rawId);

        if (seenRenderKeys.has(itemId)) {
          return null;
        }
        seenRenderKeys.add(itemId);

        return (
          <FeedItem
            key={itemId}
            item={item}
            liked={likedPosts?.[itemId]}
            likesCount={likesCount?.[itemId]}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            getDirection={getDirection}
          />
        );
      })}
    </div>
  );
};

export default React.memo(FeedList);
