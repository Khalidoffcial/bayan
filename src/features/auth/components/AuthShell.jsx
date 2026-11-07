import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "../../../i18n/useTranslation";
import LanguageSwitcher from "../../../components/ui/LanguageSwitcher";
import logo from "../../../assets/icons/logo.webp";
import workspaceImg from "../../../assets/images/Bayan Space Modern Workspace.webp";
import "./authShell.css";

/**
 * AuthShell — الإطار البصري الموحد لصفحات المصادقة.
 * Desktop: تقسيم 50/50 — يمين بصري (Workspace صورة + النبضة الزرقاء)، يسار الفورم.
 * Mobile: عمود واحد — الفورم فقط مع خلفية هادئة.
 * الهوية: Blue Premium (#0f8ee2 / Navy) — نفس لغة الـ Landing Page.
 * RTL/LTR عبر dir من useTranslation — لا نصوص ثابتة.
 */
const AuthShell = ({ titleKey, subtitleKey, children }) => {
  const { t, dir } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <div className="auth-shell" dir={dir}>
      {/* الجزء البصري — Desktop فقط */}
      <aside className="auth-shell__visual" aria-hidden="true">
        <div className="auth-shell__visual-glow" />
        <img src={workspaceImg} alt="" className="auth-shell__visual-img" loading="lazy" />
        <div className="auth-shell__visual-copy">
          <p className="auth-shell__tagline">{t("landing.hero.tagline")}</p>
        </div>
      </aside>

      {/* جانب الفورم */}
      <main className="auth-shell__formside">
        <header className="auth-shell__top">
          <Link to="/welcome" className="auth-shell__brand" aria-label={t("aria.bayanBrand")}>
            <img src={logo} alt="Bayan Space" className="auth-shell__brand-logo" />
          </Link>
          <LanguageSwitcher variant="nav" />
        </header>

        <motion.div
          className="auth-shell__card"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="auth-shell__title">{t(titleKey)}</h1>
          {subtitleKey && <p className="auth-shell__subtitle">{t(subtitleKey)}</p>}
          {children}
        </motion.div>

        <footer className="auth-shell__foot">
          <Link to="/welcome" className="auth-shell__back">
            {t("auth.backHome")}
          </Link>
        </footer>
      </main>
    </div>
  );
};

export default AuthShell;
