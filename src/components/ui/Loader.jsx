import React, { useEffect, useState } from "react";
import logo from "../../assets/icons/logo.webp";
import { useTranslation } from "../../i18n/useTranslation";
import "./Loader.css";
/**
 * Loader â€” Bayan (calm circular indicator).
 *
 * Ø¯Ù„ÙŠÙ„ ØªØ­Ù…ÙŠÙ„ Ø¯Ø§Ø¦Ø±ÙŠ Ù‡Ø§Ø¯Ø¦ Ù…Ø³Øªظˆط­ظ‰ Ù…ظ† ظ…ط¤ط´ط± Instagram Ø§ظ„ط¯ط§ط¦ط±ظٹ ظ„طھط­ظ…ظٹظ„
 * Ø§ظ„طµظˆط± â€” Ø­ظ„ظ‚ط© ط¹ط±ظٹط¶ط© Ø³ظ…ظٹظƒط© Ø¨ظ†ط³ط¨ iPhone Ùٹطھظ…ظ„ط£ Ø¨ظ†ط¹ظˆظ…Ø© (conic-gradient)
 * Ùˆظٹط¯ظˆط± ط¯ظˆط±ط© ظ†ط§ط¹ظ…ط© ط¨ط¯ظˆظ† ظ†ط¨ط¶/ظˆظ…ظٹط¶/ظ‚ظپط².
 *
 * Sizes (prop `size`):
 *   â€¢ "full"      â€” full-page loader: logo inside the ring (initial load)
 *   â€¢ "page"      â€” restrained centered ring, no logo (route/page fallback)
 *   â€¢ "inline"    â€” small ring for buttons/pagination/inline rows
 *   â€¢ "img"       â€” small ring for image placeholders (reserved dimensions)
 *
 * CSS-only motion (transform rotate + conic mask) â€” no animation libraries,
 * no JS timers. Dark/light via data-theme, RTL/LTR identical (a ring is
 * direction-neutral), respects prefers-reduced-motion (steady half-ring).
 *
 * Ù…ظ„ط§ط­ط¸ط©: ظ„ط§ ظ…ط¶ط§ط¹ظپط© ظ„ظ„ط¯ظ„ظٹظ„ â€” Ø£ظٹ ط³ظٹظ†ط§ط±ظٹظˆ ظٹظ…ط± ط¹ط¨ط± Ù…ط«ظٹظ„ ظˆط§ط­ط¯ ظ…ظ† Loader.
 */
const Loader = ({ size = "full", label, className = "" }) => {
  const [leaving, setLeaving] = useState(false);
  const { t } = useTranslation();
  const ariaLabel = label ?? t("aria.loading");

  // ÙپÙٹ "full" ظپظ‚ط·: Ø®Ø±ظˆط¬ fade ظ†ط§ط¹ظ… ظ…ظ† ط§Ù„Ø´ط§Ø´ط© Ø§Ù„Ùƒط§ظ…Ù„ط© (ط¨ط¯Ùˆظ† layout shift)
  useEffect(() => {
    if (size !== "full") return;
    const onLeave = () => setLeaving(true);
    window.addEventListener("app:loader-hide", onLeave);
    return () => window.removeEventListener("app:loader-hide", onLeave);
  }, [size]);

  const ring = (
    <span className={`bayan-ring bayan-ring--${size}`} aria-hidden="true">
      <span className="bayan-ring__mask" />
    </span>
  );

  if (size === "full") {
    return (
      <div
        className={`bayan-loader ${leaving ? "bayan-loader--leave" : ""}`}
        role="status"
        aria-label={ariaLabel}
      >
        <div className="bayan-loader__mark">
          <span className="bayan-loader__circle">
            <img src={logo} alt="" className="bayan-loader__logo" width="52" height="52" draggable="false" />
            <span className="bayan-loader__ring" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className={`bayan-inline ${className || ""}`} role="status" aria-label={ariaLabel}>
      {ring}
      {size === "page" && label !== null && (
        <span className="bayan-inline__label">{ariaLabel}</span>
      )}
    </span>
  );
};

/** Ùٹظڈط·ظ„ظ‚ Ø­ط¯ط« ط§ظ„ط®ط±ظˆط¬ â€” ظٹظڈط³طھط®ط¯ظ… ظ…ظ† ط§ظ„طھط·ط¨ظٹظ‚ ط¹ظ†ط¯ ط§ظƒطھظ…ط§ظ„ ط§ظ„طھط­ظ…ظٹظ„ */
export const hideLoader = () => {
  window.dispatchEvent(new Event("app:loader-hide"));
};
export default Loader;
