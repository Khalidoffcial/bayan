import React from "react";
import { useNavigate } from "react-router-dom";
import Top from "../../../components/layout/Top";
import Sidebar from "../../../components/layout/Sidebar";
import InlineComments from "../../../components/common/InlineComments";
import Loader from "../../../components/ui/Loader";
import PostHeader from "./PostHeader";
import PostBody from "./PostBody";
import PostActions from "./PostActions";
import usePost from "../hooks/usePost";
import { getDirection } from "../../../utils/helpers";
import "../styles/post.css";
import useAuth from "../../../hooks/useAuth";


export const PostReading = () => {
  const navigate = useNavigate();
    const { user } = useAuth();

  const {
    dataPost,
    imageUrl,
    loading,
    liked,
    likesCount,
    commented,
    setCommented,
    userId,
    handleLike,
    handleShare,
  } = usePost();

  if (loading) {
    return (
      <div className="post-reading-container">
        <Top />
        <Sidebar />
        <div className="loading"><Loader /></div>
      </div>
    );
  }

  if (!dataPost) {
    return (
      <div className="post-reading-container">
        <Top />
        <Sidebar />
        <div className="loading"><h1>Post not found</h1></div>
      </div>
    );
  }

  return (
    <div className="post-reading-container">
      <Top />
      <Sidebar />

      <div className="post-reading-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <PostHeader
          userData={dataPost.userData}
          imageUrl={imageUrl}
        />

        <PostBody
          content={dataPost.content}
          imageUrl={imageUrl}
          contentDir={getDirection(dataPost.content)}
        />

        <PostActions
          liked={liked}
          likesCount={likesCount}
          onLike={handleLike}
          onComment={() => setCommented((prev) => !prev)}
          onShare={handleShare}
        />

        {commented && <InlineComments userData={user} commentOnId={dataPost.id} contentType="posts" />}
      </div>
    </div>
  );
};

export default React.memo(PostReading);
