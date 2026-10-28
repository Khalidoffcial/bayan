import { useState, useEffect, useCallback, useMemo } from "react";
import { saveArticleOrNovel, saveIdeaPost, uploadWriterImages } from "../services/writer.service";
import { generateID } from "../../../utils/helpers";
import { SERIES_DEFAULT_LIST } from "../../../constants/categories";
import useSocket from "../../../hooks/useSocket";

export const useWriter = () => {
  const socketRef = useSocket();
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

  // Collapse the composer. Asks for confirmation before discarding a draft.
  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    if (hasDraft) {
      const confirmed = window.confirm(
        "هل تريد تجاهل المسودة؟ لن يمكن استعادتها. / Discard your draft? This cannot be undone."
      );
      if (!confirmed) return;
    }
    resetForm();
    setActive(false);
  }, [hasDraft, isSubmitting, resetForm]);

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
    try {
      const uploadedImages = await uploadWriterImages(images);
      const id = generateID();
      const payload = {
        autherID: userData?.id,
        id,
        img: uploadedImages,
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
        console.warn("Backend REST save notice:", apiError?.message || apiError);
      }

      // Broadcast new post via Socket.io to all clients
      socketRef?.current?.emit("NEW_POST", payload);

      // Trigger local instant event across the application
      window.dispatchEvent(new CustomEvent("BAYAN_NEW_POST", { detail: payload }));

      // Set user feedback
      setSuccessMessage("تم النشر بنجاح! / Published successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);

      resetForm();
      setActive(false);
    } catch (error) {
      console.error("Publish error:", error);
      // Keep the draft intact so the user does not lose their work
      setErrorMessage(
        "تعذّر النشر، حاول مرة أخرى. / Publishing failed, please try again."
      );
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
