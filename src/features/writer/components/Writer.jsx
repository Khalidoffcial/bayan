import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    handleImageChange,
    handleRemoveImage,
    handleClose,
    handleAddSeries,
    handleSubmit,
  } = useWriter();

  return (
    <>
      <motion.div className="WriterBox" onClick={() => setActive(true)}>
        <h5>Share your thoughts — write a post, article, or novels...</h5>
      </motion.div>

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

      <AnimatePresence>
        {active && (
          <>
            <motion.div
              className="Backdrop"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="WriterModal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="WriterHeader">
                <h3>Write something new</h3>
                <button onClick={handleClose} className="closeBtn">
                  ✖
                </button>
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
                >
                  <img
                    src={imageToFullscreen}
                    alt="Full view"
                    className="fullscreen-image"
                  />
                </div>
              )}

              <WriterToolbar activeType={type} onTypeChange={setType} />

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
              />

              <WriterActions
                onCancel={handleClose}
                onPublish={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Writer);
