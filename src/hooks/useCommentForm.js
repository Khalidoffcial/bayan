import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { uploadImages } from "../services/storage.service";
import cookie from "../utils/cookies";
import { generateID } from "../utils/helpers";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

export const useCommentForm = ({ commentOnId, userId, endpoint, onClose }) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [imagesPreview, setImagesPreview] = useState([]);
  const [showImage, setShowImage] = useState(false);
  const [imageToFullscreen, setImageToFullscreen] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagesPreview((prev) => [...prev, ...previews]);
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
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    if (onClose) onClose();
  }, [resetForm, onClose]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("❗ Please write a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages = await uploadImages(images);
      const targetEndpoint = endpoint || API_ENDPOINTS.SAVE_POSTS;

      await axios.post(
        targetEndpoint,
        {
          autherID: userId,
          id: generateID(),
          comment_on: commentOnId,
          img: uploadedImages,
          content,
          type: "posts",
        },
        {
          headers: {
            Authorization: "Bearer " + cookie("get"),
          },
        }
      );
      handleClose();
    } catch (err) {
      console.error("Save comment error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    content,
    setContent,
    imagesPreview,
    showImage,
    setShowImage,
    imageToFullscreen,
    setImageToFullscreen,
    isSubmitting,
    handleImageChange,
    handleRemoveImage,
    handleSubmit,
    handleClose,
  };
};

export default useCommentForm;
