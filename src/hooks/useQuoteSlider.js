import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import messagesData from "../assets/data/spotlightMessages.json";
import { useTranslation } from "../i18n/useTranslation";

/**
 * useQuoteSlider — البيانات والمنطق للمساحة التسويقية التفاعلية (Spotlight).
 *
 * - يدور على رسائل spotlightMessages.json بدل الاقتباسات الثابتة.
 * - يمنع تكرار نفس الرسالة أو نفس الـ theme مرتين متتاليتين (بترتيب دائري، لا عشوائية مطلقة).
 * - يوقف التدوير تلقائيًا عند hover أو فتح الـ composer أو document.hidden.
 * - يحترم prefers-reduced-motion (بدون أنيميشن، تبديل فوري).
 * - يختار الرسالة حسب اللغة الحالية (en / ar) من SettingsContext.
 */

export const SPOTLIGHT_INTERVAL_MS = 8000;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const useQuoteSlider = (intervalMs = SPOTLIGHT_INTERVAL_MS) => {
  const { language } = useTranslation();

  // اختيار نص الرسالة حسب لغة الواجهة — ديناميكي باسم اللغة، بلا شروط لكل لغة.
  // الصيغة في JSON: title_<lang>, desc_<lang>, cta.label_<lang>, secondary.label_<lang>
  // العربية = الحقول الأصلية (title/desc/label) — لا بادئة.
  // أي لغة تُضاف مستقبلًا إلى LANGUAGES تعمل تلقائيًا بمجرد إضافة حقولها في الـ JSON.
  const pick = (msg, base, lang) => {
    if (lang === "ar") return msg[base];
    // الإنجليزية محفوظة بصيغة قديمة titleEn — بقية اللغات بصيغة title_<lang>
    if (lang === "en") return msg[`${base}En`] ?? msg[base];
    return msg[`${base}_${lang}`] ?? msg[base];
  };

  const messages = useMemo(() => {
    const all = messagesData.messages || [];
    return all.map((m) => ({
      ...m,
      title: pick(m, "title", language),
      desc: pick(m, "desc", language),
      cta: m.cta
        ? { ...m.cta, label: pick(m.cta, "label", language) }
        : undefined,
      secondary: m.secondary
        ? { ...m.secondary, label: pick(m.secondary, "label", language) }
        : undefined,
    }));
  }, [language]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const reduceMotionRef = useRef(false);

  // خصائص تُمرَّر للمكوّن للتحكم في الإيقاف
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  const startInteraction = useCallback(() => setInteracting(true), []);
  const endInteraction = useCallback(() => setInteracting(false), []);

  useEffect(() => {
    reduceMotionRef.current = reducedMotion();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => (reduceMotionRef.current = e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // التدوير التلقائي: يتوقف عند hover أو تفاعل أو تبويب مخفي
  useEffect(() => {
    if (paused || interacting) return undefined;

    const tick = () => {
      // تجاهل التبديل لو المستخدم لسه ضاغط زر (منع قفزة أثناء النقر)
      if (document.hidden) return;
      setIndex((prev) => (prev + 1) % Math.max(messages.length, 1));
      setAnimKey((k) => k + 1);
    };

    if (reduceMotionRef.current) {
      // بلا أنيميشن: تبديل ثابت لكن أبطأ (15 ث) بدون fade
      const t = setInterval(tick, Math.max(intervalMs, 15000));
      return () => clearInterval(t);
    }

    const t = setInterval(tick, intervalMs);
    return () => clearInterval(t);
  }, [paused, interacting, intervalMs, messages.length]);

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % Math.max(messages.length, 1));
    setAnimKey((k) => k + 1);
  }, [messages.length]);

  const prev = useCallback(() => {
    setIndex((p) => (p - 1 + messages.length) % Math.max(messages.length, 1));
    setAnimKey((k) => k + 1);
  }, [messages.length]);

  const goTo = useCallback(
    (i) => {
      setIndex(((i % messages.length) + messages.length) % messages.length);
      setAnimKey((k) => k + 1);
    },
    [messages.length]
  );

  const currentMessage = messages[index] || null;

  return useMemo(
    () => ({
      index,
      total: messages.length,
      currentMessage,
      animKey,
      reducedMotion: reduceMotionRef.current,
      paused: paused || interacting,
      // Handlers للمكوّن
      onMouseEnter: pause,
      onMouseLeave: resume,
      onFocus: startInteraction,
      onBlur: endInteraction,
      next,
      prev,
      goTo,
    }),
    [
      index,
      currentMessage,
      animKey,
      paused,
      interacting,
      pause,
      resume,
      startInteraction,
      endInteraction,
      next,
      prev,
      goTo,
      messages.length,
    ]
  );
};

export default useQuoteSlider;
