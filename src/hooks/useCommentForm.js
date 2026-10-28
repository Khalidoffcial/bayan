import { useState, useEffect, useCallback, useRef } from "react";
import { uploadImages } from "../services/storage.service";
import { fetchComments, submitComment, COMMENT_MAX_LENGTH, normalizeComment } from "../services/comment.service";
import useSocket from "./useSocket";

/**
 * Comment experience hook — powers the Comments panel.
 *
 * Handles:
 *  - loading existing comments for the target content (scoped, deduplicated)
 *  - submitting a comment through the single REST write path
 *  - realtime NEW_POST comments via the shared socket (deduplicated)
 *  - loading / empty / error / submitting states
 *  - draft preservation on failure, clearing only on success
 *  - listener cleanup on unmount or content change
 */
export const useCommentForm = ({ userData,commentOnId, contentType = "posts", onClose, closeOnSuccess = true }) => {
  const socketRef = useSocket();

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentCount, setCommentCount] = useState(0);

  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [imagesPreview, setImagesPreview] = useState([]);
  const [showImage, setShowImage] = useState(false);
  const [imageToFullscreen, setImageToFullscreen] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const seenIdsRef = useRef(new Set());
  const activeIdRef = useRef(commentOnId);
  const submitInFlightRef = useRef(false);

  /* ---------- Comment list state helpers ---------- */

  const upsertComment = useCallback((comment) => {
    if (!comment || seenIdsRef.current.has(comment.id)) return false;
    seenIdsRef.current.add(comment.id);
    setComments((prev) => [...prev, comment]);
    setCommentCount((prev) => prev + 1);
    return true;
  }, []);

  const resetCommentState = useCallback(() => {
    seenIdsRef.current = new Set();
    setComments([]);
    setCommentCount(0);
    setCommentsError(null);
    setCommentsLoading(false);
  }, []);

  /* ---------- Load comments on open / content change ---------- */

  useEffect(() => {
    activeIdRef.current = commentOnId;
  }, [commentOnId]);

  useEffect(() => {
    if (!commentOnId) return undefined;

    resetCommentState();
    setCommentsLoading(true);
    let cancelled = false;

    const load = async () => {
      const { comments: loaded, error } = await fetchComments(socketRef.current, {
        contentId: commentOnId,
      });
      if (cancelled) return;

      setCommentsLoading(false);
      if (error && loaded.length === 0) {
        setCommentsError(error);
        return;
      }

      loaded.forEach((comment) => {
        if (!seenIdsRef.current.has(comment.id)) {
          seenIdsRef.current.add(comment.id);
          comments.push(comment);
        }
      });

      setComments([...loaded]);
      setCommentCount(loaded.length);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [commentOnId, socketRef, resetCommentState]);

  /* ---------- Realtime comments (shared socket, deduplicated) ---------- */

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !commentOnId) return undefined;

    const handleNewPost = (post) => {
      if (activeIdRef.current !== commentOnId) return;
      if (!post || String(post.comment_on ?? "") !== String(commentOnId)) return;
      const comment = normalizeComment(post);
      if (comment) upsertComment(comment);
    };

    socket.on("NEW_POST", handleNewPost);

    return () => {
      socket.off("NEW_POST", handleNewPost);
    };
  }, [socketRef, commentOnId, upsertComment]);

  /* ---------- Composer image handling ---------- */

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
    setImagesPreview((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove) => {
    setImagesPreview((prev) => prev.filter((_, index) => index !== indexToRemove));
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    return () => {
      imagesPreview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagesPreview]);

  const resetForm = useCallback(() => {
    setContent("");
    setImages([]);
    setImagesPreview([]);
    setShowImage(false);
    setImageToFullscreen(null);
    setIsSubmitting(false);
    setSubmitError(null);
    submitInFlightRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    if (onClose) onClose();
  }, [resetForm, onClose]);

  const retryLoading = useCallback(() => {
    setCommentsError(null);
    const id = commentOnId;
    if (!id) return;
    setCommentsLoading(true);
    fetchComments(socketRef.current, { contentId: id }).then(({ comments: loaded, error }) => {
      setCommentsLoading(false);
      if (error && loaded.length === 0) {
        setCommentsError(error);
        return;
      }
      seenIdsRef.current = new Set();
      setComments(loaded);
      setCommentCount(loaded.length);
    });
  }, [commentOnId, socketRef]);

  /* ---------- Submit ---------- */

  const handleSubmit = async () => {
    if (submitInFlightRef.current || isSubmitting) return;

    const trimmed = content.trim();
    console.log("trimmed",trimmed)
    if (!trimmed) {
      setSubmitError("Please write a comment before publishing.");
      return;
    }
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setSubmitError(`Comment is too long (max ${COMMENT_MAX_LENGTH} characters).`);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    submitInFlightRef.current = true;

    try {
      const uploadedImages = images.length ? await uploadImages(images) : [];

      const { ok, comment, error } = await submitComment({
        userData,
        contentId: commentOnId,
        contentType,
        text: trimmed,
        images: uploadedImages,
      });

      if (!ok) {
        // Keep the draft so the user does not lose their work.
        setSubmitError(error || "Failed to post comment. Please try again.");
        return;
      }

      // Persisted successfully — reconcile once (no double count increment).
      upsertComment(comment);
      resetForm();
      // Modal usage closes the panel after publishing; inline comments stay
      // open so the new comment is visible beneath the content.
      if (closeOnSuccess) handleClose();
    } catch (err) {
      setSubmitError(err?.message || "Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  const canSubmit = Boolean(content.trim()) && !isSubmitting;

  return {
    // list
    comments,
    commentCount,
    commentsLoading,
    commentsError,
    retryLoading,
    // composer
    content,
    setContent,
    canSubmit,
    imagesPreview,
    showImage,
    setShowImage,
    imageToFullscreen,
    setImageToFullscreen,
    isSubmitting,
    submitError,
    handleImageChange,
    handleRemoveImage,
    handleSubmit,
    handleClose,
  };
};

export default useCommentForm;
