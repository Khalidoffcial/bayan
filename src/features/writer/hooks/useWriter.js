import { useState, useEffect, useCallback, useMemo } from "react";
import { on as onBus, off as offBus } from "../../../utils/eventBus";
import { saveArticleOrNovel, saveIdeaPost } from "../services/writer.service";
import { uploadMediaBatch, discardUploadedMedia } from "../../../services/media.service";
import { generateID } from "../../../utils/helpers";
import { SERIES_DEFAULT_LIST } from "../../../constants/categories";
import useSocket from "../../../hooks/useSocket";
import { useToast } from "../../../components/ui/Toast";

export const useWriter = () => {
  const socketRef = useSocket();
  const toast = useToast();
  const [active, setActive] = useState(false);
  const [type, setType] = useState("post");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [imagesPreview, setImagesPreview] = useState([]);
  const [showImage, setShowImage] = useState(false);
  const [imageToFullscreen, setImageToFullscreen] = useState(null);
  const [title, setTitle] = useState("");
  const [descrip, setDescription] = useState("");
  const [series, setSeries] = useState("");
  const [customSeries, setCustomSeries] = useState("");
  const [seriesList, setSeriesList] = useState(SERIES_DEFAULT_LIST);
  const [userData, setUserData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const me = localStorage.getItem("me");
    if (me) {
      try {
        setUserData(JSON.parse(me));
      } catch (err) {
        console.error("Parse user error:", err);
      }
    }
  }, []);

  // Open the composer from anywhere (e.g. Spotlight CTA buttons).
  // detail: { type?: "post" | "article" | "novels" }
  useEffect(() => {
    const openComposer = (detail) => {
      if (detail?.type) setType(detail.type);
      setActive(true);
    };
    onBus("BAYAN_OPEN_COMPOSER", openComposer);
    return () => offBus("BAYAN_OPEN_COMPOSER", openComposer);
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagesPreview((prev) => [...prev, ...newPreviews]);
    // allow re-selecting the same file later
    e.target.value = "";
  };

  const handleRemoveImage = (imgToRemove) => {
    const index = imagesPreview.indexOf(imgToRemove);
    if (index === -1) return;
    setImagesPreview((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Whether the user has entered any work that would be lost on collapse
  const hasDraft = useMemo(
    () =>
      Boolean(
        content.trim() ||
        title.trim() ||
        descrip.trim() ||
        customSeries.trim() ||
        images.length > 0
      ),
    [content, title, descrip, customSeries, images.length]
  );

  // Publishing is allowed only with valid required fields
  const canPublish = useMemo(
    () =>
      Boolean(content.trim()) &&
      (type === "post" || Boolean(title.trim())) &&
      !isSubmitting,
    [content, title, type, isSubmitting]
  );

  const resetForm = useCallback(() => {
    setContent("");
    setTitle("");
    setDescription("");
    setSeries("");
    setCustomSeries("");
    setImages([]);
    setImagesPreview([]);
    setErrorMessage("");
    setIsSubmitting(false);
  }, []);

  // Collapse the composer. Confirms discard through the shared ConfirmDialog
  // (controlled by the Writer component) instead of window.confirm().
  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    setActive(false);
  }, [isSubmitting, resetForm]);

  const handleAddSeries = () => {
    if (customSeries) {
      setSeriesList((prev) => [...prev, customSeries]);
      setSeries(customSeries);
      setCustomSeries("");
    }
  };

  const handleSubmit = async () => {
    // Guard against duplicate submissions (double clicks / Enter)
    if (isSubmitting) return;

    if (!content.trim() || ((type === "article" || type === "novels") && !title.trim())) {
      setErrorMessage("يرجى ملء الحقول المطلوبة / Please fill in all required fields");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    let uploadedMedia = [];
    try {
      uploadedMedia = await uploadMediaBatch(images);
      const id = generateID();
      const payload = {
        autherID: userData?.id,
        id,
        img: uploadedMedia.map((m) => m.url), // توافق الحقل القديم img
        media: uploadedMedia, // سجل Cloudinary {kind,url,publicId,...}
        content,
        type,
        userData: userData
          ? {
            Id_user: userData.id,
            F_user: userData.name || userData.F_user,
            S_user: userData.username || userData.S_user,
            imgProfile: userData.imgProfile,
          }
          : undefined,
        date: new Date().toLocaleDateString("en-CA"),
      };

      try {
        if (type === "article" || type === "novels") {
          payload.title = title;
          payload.descrip = descrip;
          payload.series = series === "new" ? customSeries : series;
          await saveArticleOrNovel(payload);
        } else {
          await saveIdeaPost(payload);
        }
      } catch (apiError) {
        // Post save failed AFTER media upload — clean up orphaned Cloudinary
        // files so a retry does not leave duplicates behind, then keep the
        // draft (images stay in the composer) for the user to retry.
        console.error("Backend save failed after upload — discarding orphaned media:", apiError?.message || apiError);
        discardUploadedMedia(uploadedMedia).catch(() => {});
        uploadedMedia = [];
        throw apiError;
      }

      // Broadcast new post via Socket.io to all clients
      socketRef?.current?.emit("NEW_POST", payload);

      // Trigger local instant event across the application
      window.dispatchEvent(new CustomEvent("BAYAN_NEW_POST", { detail: payload }));

      // Set user feedback
      toast.success("تم النشر بنجاح");

      resetForm();
      setActive(false);
    } catch (error) {
      console.error("Publish error:", error);
      // Keep the draft intact so the user does not lose their work
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "تعذّر النشر، حاول مرة أخرى";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    active,
    setActive,
    type,
    setType,
    content,
    setContent,
    imagesPreview,
    showImage,
    setShowImage,
    imageToFullscreen,
    setImageToFullscreen,
    title,
    setTitle,
    descrip,
    setDescription,
    series,
    setSeries,
    seriesList,
    customSeries,
    setCustomSeries,
    isSubmitting,
    successMessage,
    errorMessage,
    hasDraft,
    canPublish,
    userData,
    handleImageChange,
    handleRemoveImage,
    handleCancel,
    handleAddSeries,
    handleSubmit,
  };
};

export default useWriter;
