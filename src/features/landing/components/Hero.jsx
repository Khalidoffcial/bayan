import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HERO_COPY } from "../landingContent";
import { useTranslation } from "../../../i18n/useTranslation";
import logoLight from "../../../assets/icons/logo.webp";
import workspaceImg from "../../../assets/images/Bayan Space Modern Workspace.webp";

/**
 * Hero — بازناء سينمائي (Apple/Mercedes-level):
 * خلفية Navy عميقة بإضاءة زرقاء ناعمة، الشعار الحقيقي كبير، عنوان ضخم،
 * زران Premium، وصورة Workspace تطفو بعمق (parallax خفيف عبر GSAP ScrollTrigger).
 * لا شبكة نقاط ولا عناصر مبعثرة.
 */
const Hero = ({ onGetStarted, onExplore }) => {
  const { language, dir } = useTranslation();
  const reduced = useReducedMotion();
  const copy = HERO_COPY[language] || HERO_COPY.en;
  const logo = logoLight;
  const rootRef = useRef(null);
  const shotRef = useRef(null);

  // Parallax ناعم للصورة أثناء التمرير — يمنح عمقًا حقيقيًا بلا أي ثقل
  // GSAP (~70KB) يُحمَّل عند الطلب فقط عندما تكون الحركة مطلوبة فعلًا.
  useEffect(() => {
    if (reduced || !shotRef.current) return undefined;
    let ctx;
    let alive = true;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (!alive || !shotRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          gsap.fromTo(
            shotRef.current,
            { yPercent: 6, scale: 1.02 },
            {
              yPercent: -6,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top top",
                end: "bottom top",
                scrub: 1.2,
              },
            }
          );
        }, rootRef);
      }
    );
    return () => {
      alive = false;
      if (ctx) ctx.revert();
    };
  }, [reduced]);

  return (
    <section className="lp-hero" dir={dir} ref={rootRef}>
      <div className="lp-hero__bg" aria-hidden="true">
        <div className="lp-hero__glow lp-hero__glow--1" />
        <div className="lp-hero__glow lp-hero__glow--2" />
      </div>

      <div className="lp-hero__inner">
        <motion.img
          src={logo}
          alt="Bayan Space"
          className="lp-hero__logo"
          width={640}
          height={295}
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.h1
          className="lp-hero__title"
          initial={reduced ? { opacity: 1 } : { opacity: 0.001, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          lang={language}
        >
          {copy.title}
        </motion.h1>

        <motion.p
          className="lp-hero__sub"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {copy.sub}
        </motion.p>

        <motion.div
          className="lp-hero__cta"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          <button type="button" className="lp-btn lp-btn--primary" onClick={onGetStarted}>
            {copy.cta}
          </button>
          <button type="button" className="lp-btn lp-btn--ghost" onClick={onExplore}>
            {copy.explore}
          </button>
        </motion.div>
      </div>

      {/* لقطة Workspace الكبيرة — تتطفو بعمق أثناء التمرير */}
      <motion.div
        className="lp-hero__shot-wrap"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          ref={shotRef}
          src={workspaceImg}
          alt="Bayan Space workspace"
          className="lp-hero__shot"
          width={1600}
          height={600}
          decoding="async"
          fetchpriority="high"
        />
      </motion.div>

      <motion.div
        className="lp-hero__scroll-hint"
        animate={reduced ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        ↓
      </motion.div>
    </section>
  );
};

export default Hero;
