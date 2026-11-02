import React, { useRef, useState, useCallback } from "react";
import { cloudinaryFeedUrl, cloudinaryFullUrl } from "../../services/media.service";
import MediaLightbox from "./MediaLightbox";
import "./mediaGallery.css";

/**
 * MediaGallery — Twitter/X-style media layouts for posts & replies.
 *
 * Renders:
 *  - up to 4 images in adaptive grids (1 = natural, 2 = split,
 *    3 = large + 2 stacked, 4 = 2x2). Original aspect ratios preserved
 *    (`object-fit: contain`) — no blanket cropping. Clicking an image
 *    opens the built-in lightbox with full-size view and, for multiple
 *    images, prev/next navigation.
 *  - at most 1 short video (<30s) — playback behavior unchanged.
 *
 * Legacy posts (single `img` URL, possibly Firebase Storage) render
 * unchanged — transformations are only applied to Cloudinary-hosted URLs.
 * An external `onOpen(item)` still wins if a parent supplies one.
 */
export const MediaGallery = ({ media = [], img = null, onOpen }) => {
  const stripRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [lightbox, setLightbox] = useState(null); // { index, images }

  const items = React.useMemo(() => {
    const mediaList = Array.isArray(media) && media.length
      ? media
      : img
        ? [{ kind: "image", url: Array.isArray(img) ? img[0] : img }] // legacy compatibility
        : [];
    return mediaList.filter((m) => m?.url);
  }, [media, img]);

  const images = items.filter((m) => m.kind !== "video");
  const imagesRef = React.useRef(images);
  imagesRef.current = images;

  const handleImageClick = useCallback((index, e) => {
    e.stopPropagation(); // never navigate to the post page by accident
    if (onOpen) {
      onOpen(imagesRef.current[index]);
      return;
    }
    setLightbox({ index, images: imagesRef.current });
  }, [onOpen]);

  if (!items.length) return null;

  const video = items.find((m) => m.kind === "video");
  const imageCount = images.length;

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - stripRef.current.offsetLeft);
    setScrollLeft(stripRef.current.scrollLeft);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    stripRef.current.scrollLeft = scrollLeft - (e.pageX - stripRef.current.offsetLeft - startX);
  };

  const stopDrag = () => setIsDragging(false);

  // Strip mode only for legacy >4 image sets (defensive).
  const layoutClass =
    imageCount >= 1 && imageCount <= 4
      ? `media-gallery--count-${imageCount}`
      : "media-gallery--strip";

  return (
    <>
      <div
        className={`media-gallery ${layoutClass}${isDragging ? " media-gallery--dragging" : ""}`}
        ref={stripRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {video && (
          <div className="media-gallery-item media-gallery-item--video">
            <video
              src={cloudinaryFullUrl(video.url)}
              controls
              preload="metadata"
              playsInline
              className="media-gallery-video"
              onClick={(e) => e.stopPropagation()} // keep player interactions inside the video
            />
          </div>
        )}

        {images.map((item, index) => (
          <div
            key={item.publicId || `${item.url}-${index}`}
            className="media-gallery-item"
            onClick={(e) => handleImageClick(index, e)}
          >
            <img
              src={cloudinaryFeedUrl(item.url)}
              alt=""
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {lightbox && (
        <MediaLightbox
          images={lightbox.images.map((m) => cloudinaryFullUrl(m.url))}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};

export default React.memo(MediaGallery);
