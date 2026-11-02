import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { on as onBus } from "../../utils/eventBus";
import useQuoteSlider from "../../hooks/useQuoteSlider";
import { useTranslation } from "../../i18n/useTranslation";
import "./styles/spotlight.css";

/**
 * QuoteSlider (Spotlight) — المساحة التسويقية التفاعلية أعلى الـ Feed.
 * البيانات: src/assets/data/spotlightMessages.json — نصوص عربية مصرية فقط.
 * الحركات تعتمد framer-motion الموجود بالفعل، وبتتوقف مع prefers-reduced-motion.
 */
export default function QuoteSlider() {
  const {
    index,
    total,
    currentMessage,
    animKey,
    reducedMotion,
    paused,
    onMouseEnter,
    onMouseLeave,
    next,
    prev,
    goTo,
  } = useQuoteSlider();

  const navigate = useNavigate();
  const [justClicked, setJustClicked] = useState(false);
  // الاتجاه والترجمة من مصدر اللغة الوحيد — يتغيران فورًا مع تغيير الإعداد

  // إيقاف التدوير مؤقتًا بعد أي نقرة زر (تجنّب تغيير الرسالة أثناء التفاعل)
  useEffect(() => {
    if (!justClicked) return undefined;
    const t = setTimeout(() => setJustClicked(false), 6000);
    return () => clearTimeout(t);
  }, [justClicked]);

  const runAction = useCallback(
    (action) => {
      if (!action) return;
      setJustClicked(true);
      if (action.startsWith("nav:")) {
        navigate(action.slice(4) || "/");
        return;
      }
      if (action.startsWith("composer:")) {
        onBus("BAYAN_OPEN_COMPOSER", { type: action.slice(9) });
      }
    },
    [navigate]
  );

  const { t, dir } = useTranslation();

  if (!currentMessage) return null;

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.22, 1, 0.36, 1] };

  return (
    <section
      className={`spotlight spotlight--${currentMessage.theme}`}
      dir={dir}
      aria-roledescription="carousel"
      aria-label={t("spotlight.section")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
    >
      <div className="spotlight__glow spotlight__glow--1" aria-hidden="true" />
      <div className="spotlight__glow spotlight__glow--2" aria-hidden="true" />

      <div className="spotlight__inner">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={animKey}
            className="spotlight__content"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            transition={transition}
          >
            <h2 className="spotlight__title">{currentMessage.title}</h2>
            <p className="spotlight__desc">{currentMessage.desc}</p>

            <div className="spotlight__actions">
              {currentMessage.cta?.label && (
                <button
                  type="button"
                  className="spotlight__btn spotlight__btn--primary"
                  onClick={() => runAction(currentMessage.cta.action)}
                >
                  {currentMessage.cta.label}
                </button>
              )}
              {currentMessage.secondary?.label && (
                <button
                  type="button"
                  className="spotlight__btn spotlight__btn--ghost"
                  onClick={() => runAction(currentMessage.secondary.action)}
                >
                  {currentMessage.secondary.label}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="spotlight__controls">
        <button
          type="button"
          className="spotlight__arrow"
          onClick={prev}
          aria-label={t("spotlight.prev")}
        >
          ‹
        </button>

        <div className="spotlight__dots" role="tablist">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("spotlight.goTo", { n: i + 1 })}
              className={`spotlight__dot ${i === index ? "active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="spotlight__arrow"
          onClick={next}
          aria-label={t("spotlight.next")}
        >
          ›
        </button>
      </div>

      {paused && (
        <span className="spotlight__status" aria-hidden="true">
          {t("spotlight.paused")}
        </span>
      )}
    </section>
  );
}
