import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaTimes } from 'react-icons/fa';
import useCommentForm from '../../hooks/useCommentForm';
import './styles/CommentModal.css';

const CommentModal = ({ isOpen, onClose, commentOnId, userId, endpoint }) => {
  const {
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
  } = useCommentForm({ commentOnId, userId, endpoint, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="Backdrop"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="WriterModal comment-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="WriterHeader">
              <h3>Write Comment</h3>
              <button className="closeBtn" onClick={handleClose}>✖</button>
            </div>

            <div className="image-gallery">
              {imagesPreview.map((img, i) => (
                <div key={i} className="image-card">
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveImage(i)}
                  >
                    <FaTimes />
                  </button>
                  <img
                    src={img}
                    alt="preview"
                    onClick={() => {
                      setShowImage(true);
                      setImageToFullscreen(img);
                    }}
                  />
                </div>
              ))}
              <label className="upload-card">
                <FaImage size={40} />
                <p>Upload Image</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {showImage && (
              <div className="image-modal" onClick={() => setShowImage(false)}>
                <img src={imageToFullscreen} alt="fullscreen" className="fullscreen-image" />
              </div>
            )}

            <textarea
              className="WriterInput"
              placeholder="Write your comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="WriterActions">
              <button className="cancelBtn" onClick={handleClose}>Cancel</button>
              <button
                className="submitBtn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default React.memo(CommentModal);

