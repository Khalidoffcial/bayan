import React, { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "../../../i18n/useTranslation";

/**
 * useReveal — ظهور تدريجي هادئ عند دخول القسم للشاشة.
 * يحترم prefers-reduced-motion (بدون حركة، يظهر فورًا).
 */
export const useReveal = () => {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const initial = reduced ? { opacity: 1 } : { opacity: 0, y: 24 };
  const whileInView = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };
  const viewport = { once: true, margin: "-80px" };

  return { ref, initial, whileInView, viewport, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } };
};

/** Section wrapper موحّد للتمركز والمسافات */
export const LandingSection = ({ children, className = "", id }) => {
  const reveal = useReveal();
  return (
    <section id={id} className={`landing-section ${className}`}>
      <motion.div
        ref={reveal.ref}
        initial={reveal.initial}
        whileInView={reveal.whileInView}
        viewport={reveal.viewport}
        transition={reveal.transition}
        className="landing-section__inner"
      >
        {children}
      </motion.div>
    </section>
  );
};

/** عنوان قسم موحّد */
export const SectionHeading = ({ eyebrowKey, titleKey }) => {
  const { t } = useTranslation();
  return (
    <header className="landing-heading">
      {eyebrowKey && <span className="landing-heading__eyebrow">{t(eyebrowKey)}</span>}
      <h2 className="landing-heading__title">{t(titleKey)}</h2>
    </header>
  );
};

export default LandingSection;
