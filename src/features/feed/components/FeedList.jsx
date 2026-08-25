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

  return (
    <div className="feed-list">
      {feed.map((item) => (
        <FeedItem
          key={item.id}
          item={item}
          liked={likedPosts?.[item.id]}
          likesCount={likesCount?.[item.id]}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          getDirection={getDirection}
        />
      ))}
    </div>
  );
};

export default React.memo(FeedList);
