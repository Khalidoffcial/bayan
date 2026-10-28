import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaImage, FaTimes, FaGlobeAsia } from "react-icons/fa";
import WriterToolbar from "./WriterToolbar";
import WriterEditor from "./WriterEditor";
import WriterImages from "./WriterImages";
import WriterActions from "./WriterActions";
import useWriter from "../hooks/useWriter";
import "../styles/writer.css";

export const Writer = () => {
  const {
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
  } = useWriter();

  const editorRef = useRef(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const handleCancelClick = () => {
    if (hasDraft && !confirmingDiscard) {
      setConfirmingDiscard(true);
      window.clearTimeout(handleCancelClick._t);
      handleCancelClick._t = window.setTimeout(() => setConfirmingDiscard(false), 4000);
      return;
    }
    setConfirmingDiscard(false);
    handleCancel();
  };

  return (
    <div className="InlineComposer" role="region" aria-label="Content composer">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            className="writer-toast-success"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="composer-card"
        layout
        transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      >
        {!active ? (
          // ---------- Collapsed trigger row ----------
          <button
            className="composer-collapsed"
            onClick={() => setActive(true)}
            aria-label="Open composer to write a post, article or novel"
          >
            <img
              className="composer-avatar"
              src={userData?.imgProfile || "https://ui-avatars.com/api/?name=U&background=0F8EE2&color=fff"}
              alt=""
            />
            <span className="composer-placeholder">
              What's on your mind? Share an idea...
            </span>
            <span className="composer-image-hint" aria-hidden="true">
              <FaImage />
            </span>
          </button>
        ) : (
          // ---------- Expanded composer ----------
          <div className="composer-expanded">
            <div className="composer-header">
              <img
                className="composer-avatar"
                src={userData?.imgProfile || "https://ui-avatars.com/api/?name=U&background=0F8EE2&color=fff"}
                alt=""
              />
              <div className="composer-header-meta">
                <span className="composer-username">
                  {userData?.name || userData?.F_user || "You"}
                </span>
                <span className="composer-visibility">
                  <FaGlobeAsia size={12} /> Public
                </span>
              </div>
              <button
                className="composer-close"
                onClick={handleCancelClick}
                aria-label="Close composer"
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <WriterToolbar activeType={type} onTypeChange={setType} />

            <div ref={editorRef} className="composer-editor-area" tabIndex={-1}>
              <WriterEditor
                type={type}
                content={content}
                setContent={setContent}
                title={title}
                setTitle={setTitle}
                descrip={descrip}
                setDescription={setDescription}
                series={series}
                setSeries={setSeries}
                seriesList={seriesList}
                customSeries={customSeries}
                setCustomSeries={setCustomSeries}
                onAddSeries={handleAddSeries}
                autoFocus
              />
            </div>

            <WriterImages
              imagesPreview={imagesPreview}
              onImageChange={handleImageChange}
              onRemoveImage={handleRemoveImage}
              onImageClick={(img) => {
                setShowImage(true);
                setImageToFullscreen(img);
              }}
            />

            {showImage && (
              <div
                className="image-modal"
                onClick={() => setShowImage(false)}
                role="dialog"
                aria-label="Image full view"
              >
                <img
                  src={imageToFullscreen}
                  alt="Full view"
                  className="fullscreen-image"
                />
              </div>
            )}

            {errorMessage && (
              <p className="composer-error" role="alert">
                {errorMessage}
              </p>
            )}

            {confirmingDiscard && (
              <div className="composer-discard-confirm" role="alertdialog" aria-label="Discard draft">
                <span>تجاهل المسودة؟ / Discard your draft?</span>
                <button className="discard-yes" onClick={handleCancelClick}>نعم / Yes</button>
                <button className="discard-no" onClick={() => setConfirmingDiscard(false)}>لا / No</button>
              </div>
            )}

            <WriterActions
              onCancel={handleCancelClick}
              onPublish={handleSubmit}
              isSubmitting={isSubmitting}
              canPublish={canPublish}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(Writer);
