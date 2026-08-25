import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { sharePost } from "../services/post.service";
import useAuth from "../../../hooks/useAuth";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

export const usePost = () => {
  const { postId } = useParams();
  const location = useLocation();
  const socketRef = useRef(null);
  const { user } = useAuth();

  const [dataPost, setDataPost] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commented, setCommented] = useState(false);

  useEffect(() => {
    socketRef.current = io(API_BASE_URL);
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (location.state) {
      setDataPost(location.state);
      if (location.state?.img?.length > 0) {
        setImageUrl(location.state.img[0]);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [postId, location.state]);

  const handleLike = useCallback(() => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    socketRef.current?.emit("ENGAGEMENT", {
      contentId: dataPost?.id,
      userId: user?.id,
      type: newLiked ? "like" : "unlike",
    });
  }, [liked, dataPost?.id, user?.id]);

  const handleShare = useCallback(() => {
    sharePost({
      title: dataPost?.content?.slice(0, 50),
      url: window.location.href,
    });
  }, [dataPost?.content]);

  return {
    postId,
    dataPost,
    imageUrl,
    loading,
    liked,
    likesCount,
    commented,
    setCommented,
    userId: user?.id,
    handleLike,
    handleShare,
  };
};

export default usePost;
