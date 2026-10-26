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
  userId
}) => {
  if (!feed || feed.length === 0) return null;
  
  const seenRenderKeys = new Set();

  return (
    <div className="feed-list">
      {feed.map((item, index) => {
        const rawId = item.id ?? item._id ?? item.id_post ?? `feed-item-${index}`;
        const itemId = String(rawId);
console.log("feeds: ",feed)
console.log("item like count: ",item?.likesCount)
console.log("----: ",item?.likesBy?.[userId] || false)
        if (seenRenderKeys.has(itemId)) {
          return null;
        }
        seenRenderKeys.add(itemId);

        return (
  <FeedItem
    key={itemId}
    item={item}
    liked={likedPosts?.[itemId] ?? Boolean(item?.likesBy?.[userId])}
    likesCount={
      likesCount?.[itemId] ??
      item?.likesCount ??
      item?.likes ??
      0
    }
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
