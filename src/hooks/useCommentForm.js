import { useState, useEffect, useCallback, useRef } from "react";
import { uploadMediaBatch } from "../services/media.service";
import { fetchComments, submitComment, COMMENT_MAX_LENGTH, normalizeComment } from "../services/comment.service";
import useSocket from "./useSocket";

/** Same normalization the comment service uses for IDs. */
const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

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
export const useCommentForm = ({ userData,commentOnId, contentType = "posts", onClose, closeOnSuccess = true, openByDefault = false }) => {
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
  const [isOpen, setIsOpen] = useState(openByDefault);

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
    if (!commentOnId || !isOpen) return undefined;

    resetCommentState();
    setCommentsLoading(true);
    let cancelled = false;

    const load = async () => {
      const { comments: loaded, error } = await fetchComments({
        contentId: commentOnId,
      });
      if (cancelled) return;

      setCommentsLoading(false);
      if (error && loaded.length === 0) {
        setCommentsError(error);
        return;
      }

      // Replace state wholesale — no direct mutation of arrays.
      seenIdsRef.current = new Set(loaded.map((comment) => comment.id));
      setComments(loaded);
      setCommentCount(loaded.length);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [commentOnId, isOpen, socketRef, resetCommentState]);

  /* ---------- Realtime comments (shared socket, deduplicated) ---------- */

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !commentOnId || !isOpen) return undefined;

    const handleNewPost = (payload) => {
      if (activeIdRef.current !== commentOnId) return;
      // Server re-emits the raw post object; the local writer wrapper may
      // broadcast the same shape. Accept either.
      const post = payload?.post ?? payload;
      if (!post || String(post.comment_on ?? "") !== String(commentOnId)) return;
      const comment = normalizeComment(post);
      if (comment) upsertComment(comment);
    };

    socket.on("NEW_POST", handleNewPost);

    return () => {
      socket.off("NEW_POST", handleNewPost);
    };
  }, [socketRef, commentOnId, isOpen, upsertComment]);

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
    else setIsOpen(false);
  }, [resetForm, onClose]);

  /** Toggle the reply section open/closed (comment button). */
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const retryLoading = useCallback(() => {
    setCommentsError(null);
    const id = commentOnId;
    if (!id || !isOpen) return;
    setCommentsLoading(true);
    fetchComments({ contentId: id }).then(({ comments: loaded, error }) => {
      setCommentsLoading(false);
      if (error && loaded.length === 0) {
        setCommentsError(error);
        return;
      }
      seenIdsRef.current = new Set();
      setComments(loaded);
      setCommentCount(loaded.length);
    });
  }, [commentOnId, isOpen, socketRef]);

  /* ---------- Submit ---------- */

  const handleSubmit = useCallback(async (passedUserId) => {
  if (submitInFlightRef.current || isSubmitting) return;

  // The authenticated user's real ID (`user.id`) is required by the backend
  // contract (`autherID`). Fall back to the user object supplied to the hook.
  const userId = normalizeId(passedUserId) || normalizeId(userData?.id);

  const trimmed = content.trim();

  if (!userId) {
    setSubmitError("Unable to identify your account. Please sign in again.");
    return;
  }

  if (!trimmed) {
    setSubmitError("Please write a comment before publishing.");
    return;
  }

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    setSubmitError(
      `Comment is too long (max ${COMMENT_MAX_LENGTH} characters).`
    );
    return;
  }

  setSubmitError(null);
  setIsSubmitting(true);
  submitInFlightRef.current = true;

  try {
    const uploadedMedia = images.length
      ? await uploadMediaBatch(images)
      : [];

    const { ok, comment, error } = await submitComment({
      userData,
      contentId: commentOnId,
      contentType,
      userId, // المهم: تمرير الـ ID الحقيقي
      text: trimmed,
      media: uploadedMedia, // Cloudinary records {kind,url,publicId,...}
    });

    if (!ok) {
      setSubmitError(error || "Failed to post comment. Please try again.");
      return;
    }

    upsertComment(comment);

    // Notify profile caches: the REPLY authored by the logged-in user must
    // appear in THEIR profile feed (Replies tab) without a refresh. The
    // server's NEW_POST broadcast covers OTHER tabs' inline threads; this
    // event covers the author's own profile cache (BAYAN_NEW_POST listener
    // in useProfileContent prepends into the author's cached tabs).
    if (comment?._raw) {
      window.dispatchEvent(new CustomEvent("BAYAN_NEW_POST", { detail: comment._raw }));
    }

    resetForm();

    if (closeOnSuccess) handleClose();
  } catch (err) {
    setSubmitError(
      err?.message || "Failed to post comment. Please try again."
    );
  } finally {
    setIsSubmitting(false);
    submitInFlightRef.current = false;
  }
  }, [content, images, userData, commentOnId, contentType, isSubmitting, upsertComment, resetForm, handleClose]);
 
  const canSubmit = Boolean(content.trim()) && !isSubmitting;

  return {
    // list
    comments,
    commentCount,
    commentsLoading,
    commentsError,
    retryLoading,
    isOpen,
    toggleOpen,
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
