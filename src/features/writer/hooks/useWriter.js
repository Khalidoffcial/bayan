import { useState, useEffect, useCallback } from "react";
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
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagesPreview((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (imgToRemove) => {
    setImagesPreview((prev) => prev.filter((s) => s !== imgToRemove));
  };

  const handleClose = useCallback(() => {
    setActive(false);
    setContent("");
    setTitle("");
    setDescription("");
    setSeries("");
    setCustomSeries("");
    setImages([]);
    setImagesPreview([]);
    setIsSubmitting(false);
  }, []);

  const handleAddSeries = () => {
    if (customSeries) {
      setSeriesList((prev) => [...prev, customSeries]);
      setSeries(customSeries);
      setCustomSeries("");
    }
  };

  const handleSubmit = async () => {
    if (!content || ((type === "article" || type === "novels") && !title)) {
      alert("❗ Please fill in all required fields");
      return;
    }

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

      handleClose();
    } catch (error) {
      console.error("Publish error:", error);
      handleClose();
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
    handleImageChange,
    handleRemoveImage,
    handleClose,
    handleAddSeries,
    handleSubmit,
  };
};

export default useWriter;
