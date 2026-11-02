import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { sharePost, fetchPostById } from "../services/post.service";
import useAuth from "../../../hooks/useAuth";
import useSocket from "../../../hooks/useSocket";

export const usePost = () => {
  const { postId } = useParams();
  const location = useLocation();
  const socketRef = useSocket();
  const { user } = useAuth();

  const [dataPost, setDataPost] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState();
  const [commented, setCommented] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (location.state) {
      setDataPost(location.state);
      if (location.state?.img?.length > 0) {
        setImageUrl(location.state.img[0]);
      }
      setLoading(false);
    } else if (!postId) {
      // No route param and no navigation state — nothing to load.
      setLoading(false);
    } else {
      // Deep link / page refresh: fetch the post (or reply) from the server.
      setLoading(true);
      fetchPostById(postId).then(({ post, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !post) {
          setDataPost(null);
          return;
        }
        setDataPost(post);
        if (post?.img?.length > 0) {
          setImageUrl(post.img[0]);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [postId, location.state]);

    // مزامنة حالة اللايك والعداد مع بيانات البوست والمستخدم
  useEffect(() => {
    if (!dataPost) {
      setLiked(false);
      setLikesCount(0);
      return;
    }

    const userId = user?.id;

    setLiked(
      userId != null
        ? Boolean(dataPost.likesBy?.[userId])
        : false
    );

    const initialCount = Number(
      dataPost.likesCount ?? dataPost.likes ?? 0
    );

    setLikesCount(
      Number.isFinite(initialCount) ? initialCount : 0
    );
  }, [dataPost, user?.id]);

  const handleLike = useCallback(() => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    socketRef.current?.emit("ENGAGEMENT", {
      contentId: dataPost?.id,
      userId: user?.id,
      type: newLiked ? "like" : "unlike",
    });

    console.log("like",[liked, dataPost?.likesCount + 1, user?.id]) 
        console.log(dataPost)

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
    setDataPost,
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

