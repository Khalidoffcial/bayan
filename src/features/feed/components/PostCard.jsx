import React from "react";
import { useNavigate } from "react-router-dom";
import FeedUser from "./FeedUser";
import FeedActions from "./FeedActions";

export const PostCard = ({
  item,
  liked,
  likesCount,
  onLike,
  onComment,
  onShare,
  getDirection,
}) => {
  const navigate = useNavigate();
  const dir = getDirection ? getDirection(item.content) : "ltr";

  return (
    <div className="container_post post-card">
      <FeedUser userData={item.userData} />

      {item.img?.length > 0 && (
        <div className="img_article">
          <img src={item.img[0]} alt={item.content?.slice(0, 50) || "Post image"} />
        </div>
      )}

      <div
        className="content_Post"
        dir={dir}
        onClick={() => navigate(`/rp/${item.id}`, { state: item })}
        style={{
          textAlign: dir === "rtl" ? "right" : "left",
        }}
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />

      <div className="his_Post">{item.date}</div>

      <FeedActions
        itemId={item.id}
        liked={liked}
        likesCount={likesCount}
        onLike={onLike}
        onComment={onComment}
        onShare={() => onShare(item)}
      />
    </div>
  );
};

export default React.memo(PostCard);
