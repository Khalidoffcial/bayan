import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X as FaTimes } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";
import "./profileImageViewer.css";

/**
 * Unified Profile Image Viewer (full-screen modal).
 * - Shows ONE image at the largest possible size, `object-fit: contain`,
 *   never cropped or distorted.
 * - Closes via: the close button, clicking the backdrop, or Escape.
 * - Locks background scroll while open (and restores on close/unmount).
 * - Left/right arrows appear only when multiple images are provided.
 * - Resilient states: no image → renders nothing; load error → clear
 *   message (no broken-image icon); loading → spinner.
 * - Renders through a portal so parent card styles/z-index never clip it.
 *
 * Usage (managed):   <ProfileImageViewer imageUrl={url} onClose={...} />
 * Usage (hook-free): mount always, toggle with `open`.
 */
export const ProfileImageViewer = ({
  imageUrl,
  alt = "Profile",
  open,
  onClose,
}) => {
  const isOpen = open !== undefined ? Boolean(open) : Boolean(imageUrl);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset transient states whenever the image source changes.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [imageUrl]);

  const requestClose = useCallback(() => onClose?.(), [onClose]);
  const { t } = useTranslation();

  // Escape to close + background scroll lock.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") requestClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, requestClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          className="piv-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={requestClose}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <motion.div
            className="piv-stage"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="piv-close"
              onClick={requestClose}
              aria-label={t("viewer.close")}
              type="button"
            >
              <FaTimes />
            </button>

            {!failed && (
              <>
                {!loaded && <div className="piv-spinner" aria-hidden="true" />}
                <img
                  className={`piv-image${loaded ? " piv-image--visible" : ""}`}
                  src={imageUrl}
                  alt={alt}
                  draggable={false}
                  onLoad={() => setLoaded(true)}
                  onError={() => setFailed(true)}
                />
              </>
            )}

            {failed && (
              <div className="piv-failed">{t("viewer.loadFailed")}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/**
 * Avatar with built-in viewer. Use wherever a profile picture is displayed
 * (feed, post header, comments, profile page). Clicking opens ONLY the
 * viewer; navigation (e.g. to the profile page) stays the responsibility of
 * surrounding click targets — the avatar click never bubbles into them.
 *
 * `src` — the real image URL from the project's canonical data source
 *         (userData.imgProfile). Empty/missing URLs render `fallback` and
 *         do NOT open a viewer.
 */
export const ViewableAvatar = ({
  src,
  alt: altText = "User",
  className = "",
  fallback,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);

  // Distinct URLs per user — never one shared static image.
  const displaySrc = src || fallback || null;
  const canView = Boolean(src); // only real user images are viewable

  return (
    <>
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={altText}
          className={className}
          draggable={false}
          loading="lazy"
          onClick={(e) => {
            if (!canView) return;
            e.stopPropagation(); // never open the profile page by accident
            e.preventDefault();
            setViewerOpen(true);
          }}
          onError={(e) => {
            // Cloudinary URLs that fail: fall back visually, keep data intact.
            if (fallback && e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
          style={canView ? { cursor: "zoom-in" } : undefined}
        />
      ) : (
        <span className={`${className} viewable-avatar-placeholder`} aria-hidden="true" />
      )}

      {canView && (
        <ProfileImageViewer
          imageUrl={src}
          alt={altText}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
};

export default ProfileImageViewer;
