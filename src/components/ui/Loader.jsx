import React, { useEffect, useState } from "react";
import logoLight from "../../assets/icons/logo.png";
import "./Loader.css";

/**
 * Loader — Apple-simple, مصقول:
 * شعار Bayan في المنتصف + خط تحميل رفيع أزرق (#0f8ee2) يتحرك تحته.
 * حركة واحدة ناعمة، خروج fade عند الإزالة، بلا Glow/3D/جسيمات.
 * فاتح/داكن عبر data-theme، ويحترم prefers-reduced-motion.
 */
const Loader = () => {
  const [leaving, setLeaving] = useState(false);

  // خروج fade ناعم قبل إزالة العنصر من الـ DOM
  useEffect(() => {
    const onLeave = () => setLeaving(true);
    window.addEventListener("app:loader-hide", onLeave);
    return () => window.removeEventListener("app:loader-hide", onLeave);
  }, []);

  return (
    <div
      className={`bayan-loader ${leaving ? "bayan-loader--leave" : ""}`}
      role="status"
      aria-label="Loading"
    >
      <div className="bayan-loader__mark">
        <img src={logoLight} alt="" className="bayan-loader__logo" draggable="false" />
        <span className="bayan-loader__bar" aria-hidden="true" />
      </div>
    </div>
  );
};

/** يُطلق حدث الخروج — يُستخدم من التطبيق عند اكتمال التحميل */
export const hideLoader = () => {
  window.dispatchEvent(new Event("app:loader-hide"));
};

export default Loader;
