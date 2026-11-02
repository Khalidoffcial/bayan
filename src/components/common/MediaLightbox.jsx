import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./mediaLightbox.css";

/**
 * MediaLightbox — full-size image viewer for post media.
 * Full image with `object-fit: contain`, prev/next navigation for multi-image
 * posts, Escape/backdrop/close-button dismissal, background scroll locked.
 */
export const MediaLightbox = ({ images = [], startIndex = 0, onClose }) => {
  const [index, setIndex] = React.useState(
    Math.min(Math.max(startIndex, 0), Math.max(images.length - 1, 0))
  );

  const prev = useCallback(
    () => setIndex((i) => (i > 0 ? i - 1 : i)),
    []
  );
  const next = useCallback(
    () => setIndex((i) => (i < images.length - 1 ? i + 1 : i)),
    [images.length]
  );

  useEffect(() => {
    if (!images.length) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, onClose, prev, next]);

  if (typeof document === "undefined" || !images.length) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="mlb-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="عرض الصورة"
      >
        <motion.div
          className="mlb-stage"
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="mlb-close" onClick={onClose} aria-label="إغلاق" type="button">
            <FaTimes />
          </button>

          {images.length > 1 && (
            <>
              <button
                className="mlb-nav mlb-nav--prev"
                onClick={prev}
                disabled={index === 0}
                aria-label="السابق"
                type="button"
              >
                <FaChevronLeft />
              </button>
              <button
                className="mlb-nav mlb-nav--next"
                onClick={next}
                disabled={index === images.length - 1}
                aria-label="التالي"
                type="button"
              >
                <FaChevronRight />
              </button>
              <div className="mlb-counter">
                {index + 1} / {images.length}
              </div>
            </>
          )}

          <img
            key={images[index]}
            className="mlb-image"
            src={images[index]}
            alt=""
            draggable={false}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default MediaLightbox;
