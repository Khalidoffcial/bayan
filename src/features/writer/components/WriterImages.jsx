import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as FaImage, X as FaTimes } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";

export const WriterImages = ({
  imagesPreview,
  onImageChange,
  onRemoveImage,
  onImageClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="upload-container">
    <div className="image-gallery">
        <AnimatePresence>
          {imagesPreview.map((img, i) => (
            <motion.div
              key={img}
              className="image-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <button
                className="remove-btn"
                onClick={() => onRemoveImage(img)}
                aria-label={t("writer.removeImage")}
              >
                <FaTimes />
              </button>
              <img
                src={img}
                alt={`preview-${i}`}
                onClick={() => onImageClick(img)}
              />
            </motion.div>
          ))}

          <label htmlFor="upload-image-input" className="upload-card">
            <FaImage size={36} />
            <p>{t("writer.uploadImages")}</p>
            <input
              id="upload-image-input"
              type="file"
              accept="image/*"
              multiple
              onChange={onImageChange}
              hidden
            />
          </label>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default React.memo(WriterImages);
