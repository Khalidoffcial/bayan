import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LandingSection, { SectionHeading } from "./LandingPrimitives";
import { LANDING_MODES, LANDING_FEATURES, WHY_POINTS, FOOTER_LINKS, SOCIAL_LINKS } from "../landingContent";
import { useTranslation } from "../../../i18n/useTranslation";
import logo from "../../../assets/icons/logo.webp";
import workspaceImg from "../../../assets/images/Bayan Space Modern Workspace.webp";
import interfaceImg from "../../../assets/images/bayan-interface.webp";

/* ============ ما هي Bayan Space؟ — Editorial split: نص ضخم يسار، صورة يمين ============ */
export const WhatIs = () => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-what" id="what">
      <div className="lp-what__split">
        <div className="lp-what__text">
          <SectionHeading eyebrowKey="landing.what.eyebrow" titleKey="landing.what.title" />
          <p className="lp-what__lead">{t("landing.what.lead")}</p>
          <div className="lp-what__points">
            {[1, 2, 3, 4].map((n) => (
              <p key={n} className="lp-what__point">
                {t(`landing.what.point${n}`)}
              </p>
            ))}
          </div>
        </div>
        <figure className="lp-what__figure">
          <img src={interfaceImg} alt={t("landing.what.title")} loading="lazy" decoding="async" width={1600} height={776} />
        </figure>
      </div>
    </LandingSection>
  );
};

/* ============ Modes — معرض بصري متنوع: بطاقة أولى كبيرة + بطاقات متدرجة الأحجام ============ */
export const Modes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const contentModes = LANDING_MODES.filter((m) => !m.isExperience);
  const experienceModes = LANDING_MODES.filter((m) => m.isExperience);

  const renderMode = (mode, i) => (
    <button
      key={mode.id}
      type="button"
      className={`lp-mode lp-mode--${i === 0 ? "wide" : i % 2 === 0 ? "tall" : "std"}`}
      onClick={() => navigate(mode.path)}
      aria-label={t(mode.titleKey)}
    >
      <span className="lp-mode__glow" aria-hidden="true" />
      <span className="lp-mode__head">
        <span className="lp-mode__iconwrap">
          <img src={mode.icon} alt="" className="lp-mode__icon" loading="lazy" />
        </span>
        <h3 className="lp-mode__title">{t(mode.titleKey)}</h3>
      </span>
      <p className="lp-mode__desc">{t(mode.descKey)}</p>
      <span className="lp-mode__cta">
        <span>{t("landing.mode.open")}</span>
        <span className="lp-mode__arrow" aria-hidden="true">→</span>
      </span>
    </button>
  );

  return (
    <LandingSection className="lp-modes" id="modes">
      <SectionHeading eyebrowKey="landing.modes.eyebrow" titleKey="landing.modes.title" />
      <div className="lp-modes__mosaic">
        {contentModes.map((m, i) => renderMode(m, i))}
      </div>

      <h3 className="lp-modes__subtitle">{t("landing.modes.experience")}</h3>
      <div className="lp-modes__mosaic lp-modes__mosaic--experience">
        {experienceModes.map((m, i) => renderMode(m, i + 1))}
      </div>
    </LandingSection>
  );
};

/* ============ تجربة المنتج — صورة الواجهة بحجم كبير مع حركة scroll ============ */
export const ProductPreview = () => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-preview" id="preview">
      <SectionHeading eyebrowKey="landing.preview.eyebrow" titleKey="landing.preview.title" />
      <motion.div
        className="lp-preview__stage"
        initial={{ opacity: 0, y: 40, rotateX: 4 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={workspaceImg} alt={t("landing.preview.workspace")} loading="lazy" decoding="async" width={1600} height={600} />
      </motion.div>
      <p className="lp-preview__caption">{t("landing.preview.workspace")}</p>
      <div className="lp-preview__interface">
        <img src={interfaceImg} alt={t("landing.preview.title")} loading="lazy" decoding="async" width={1600} height={776} />
      </div>
    </LandingSection>
  );
};

/* ============ المميزات — شبكة زرقاء داكنة مقسومة ============ */
export const Features = () => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-features" id="features">
      <SectionHeading eyebrowKey="landing.features.eyebrow" titleKey="landing.features.title" />
      <div className="lp-features__editorial">
        {LANDING_FEATURES.map((f) => (
          <article key={f.id} className="lp-feature">
            <span className="lp-feature__glyph" aria-hidden="true">{f.icon}</span>
            <div className="lp-feature__body">
              <h3 className="lp-feature__title">{t(f.titleKey)}</h3>
              <p className="lp-feature__desc">{t(f.descKey)}</p>
            </div>
          </article>
        ))}
      </div>
    </LandingSection>
  );
};

/* ============ لماذا Bayan؟ — أرقام صريحة وقائمة Editorial ============ */
export const Why = () => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-why" id="why">
      <SectionHeading eyebrowKey="landing.why.eyebrow" titleKey="landing.why.title" />
      <ul className="lp-why__list">
        {WHY_POINTS.map((w) => (
          <li key={w.key} className="lp-why__item">
            <span className="lp-why__tick" aria-hidden="true">—</span>
            {t(w.key)}
          </li>
        ))}
      </ul>
    </LandingSection>
  );
};

/* ============ آراء القرّاء — بديل صادق: مبادئ المنصة بدل شهادات وهمية ============ */
export const Testimonials = () => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-testimonials" id="testimonials">
      <SectionHeading eyebrowKey="landing.testimonials.eyebrow" titleKey="landing.testimonials.title" />
      <div className="lp-testimonials__promise">
        <p className="lp-testimonials__lead">{t("landing.testimonials.empty")}</p>
        <div className="lp-testimonials__pillars">
          {[1, 2, 3].map((n) => (
            <div key={n} className="lp-testimonials__pillar">
              <span className="lp-testimonials__num">0{n}</span>
              <p>{t(`landing.testimonials.pillar${n}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </LandingSection>
  );
};

/* ============ CTA الختامي ============ */
export const FinalCta = ({ onGetStarted }) => {
  const { t } = useTranslation();
  return (
    <LandingSection className="lp-final" id="start">
      <div className="lp-final__inner">
        <img src={logo} alt="" className="lp-final__logo" aria-hidden="true" loading="lazy" />
        <h2 className="lp-final__title">{t("landing.final.title")}</h2>
        <p className="lp-final__sub">{t("landing.final.sub")}</p>
        <div className="lp-final__actions">
          <button type="button" className="lp-btn lp-btn--primary" onClick={onGetStarted}>
            {t("landing.final.start")}
          </button>
          <Link to="/signin" className="lp-btn lp-btn--ghost">
            {t("landing.final.login")}
          </Link>
        </div>
      </div>
    </LandingSection>
  );
};

/* ============ الفوتر ============ */
export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="lp-footer" dir="auto">
      <div className="lp-footer__inner">
        <div className="lp-footer__brand">
          <img src={logo} alt="Bayan Space" className="lp-footer__logo-img" />
          <p className="lp-footer__about">{t("landing.footer.about")}</p>
        </div>

        <nav className="lp-footer__col" aria-label={t("landing.footer.legal")}>
          <h4>{t("landing.footer.legal")}</h4>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="lp-footer__link">
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="lp-footer__col">
          <h4>{t("landing.footer.contact")}</h4>
          <div className="lp-footer__social">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="lp-footer__link">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="lp-footer__bottom">
        <span>© {new Date().getFullYear()} Bayan Space — {t("landing.footer.rights")}</span>
      </div>
    </footer>
  );
};
