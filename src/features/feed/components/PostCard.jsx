import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";

import FeedUser from "./FeedUser";
import FeedActions from "./FeedActions";
import InlineComments from "../../../components/common/InlineComments";

export const PostCard = ({
  item,
  liked,
  likesCount,
  commentsCount,
  commentsOpen = false,
  onLike,
  onComment,
  onShare,
  getDirection,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
        commentsCount={commentsCount}
        onLike={onLike}
        onComment={onComment}
        onShare={() => onShare(item)}
      />

      {commentsOpen && <InlineComments userData={user} commentOnId={item.id} contentType="posts" />}
    </div>
  );
};

export default React.memo(PostCard);
