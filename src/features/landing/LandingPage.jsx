import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Hero from "./components/Hero";
import { WhatIs, Modes, Features, Why, Testimonials, FinalCta, Footer, ProductPreview } from "./components/LandingSections";
import { HERO_COPY } from "./landingContent";
import { useTranslation } from "../../i18n/useTranslation";
import cookie from "../../utils/cookies";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import logo from "../../assets/icons/logo.webp";
import "./landing.css";

/**
 * LandingPage — أول صفحة للزائر غير المسجل.
 * المستخدم المسجل يُحوّل تلقائيًا إلى / (الرئيسية الحالية) — بلا Landing في كل مرة.
 * Deep linking: بعد الدخول من صفحة محمية، React Router يعيد للوجهة عبر state — لم نلمس الـ guards.
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const { t, language, dir } = useTranslation();
  const copy = HERO_COPY[language] || HERO_COPY.en;

  // زيّر مسجل؟ → الرئيسية مباشرة (فحص هادئ بلا toast)
  useEffect(() => {
    const token = cookie("get") || localStorage.getItem("token") || localStorage.getItem("Token");
    if (!token) return;
    let alive = true;
    import("../../features/auth/services/auth.service").then(({ verifyAuthToken }) =>
      verifyAuthToken(token)
        .then(() => { if (alive) navigate("/", { replace: true }); })
        .catch(() => { })
    );
    return () => { alive = false; };
  }, [navigate]);

  const canonical = "https://bayan-space.vercel.app/";

  return (
    <div className="lp" dir={dir}>
      <Helmet>
        <html lang={language} />
        <title>{`Bayan Space — ${copy.title}`}</title>
        <meta name="description" content={copy.sub} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`Bayan Space — ${copy.title}`} />
        <meta property="og:description" content={copy.sub} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Bayan Space", url: canonical,
            inLanguage: language,
          })}
        </script>
      </Helmet>

      <header className="lp-nav">
        <a href="#top" className="lp-nav__brand" aria-label={t("aria.bayanBrand")}>
          <img src={logo} alt="Bayan Space" className="lp-nav__brand-img" />
        </a>
        <nav className="lp-nav__links" aria-label={t("aria.main")}>
          <a href="#modes" className="lp-nav__link">{t("landing.nav.modes")}</a>
          <a href="#features" className="lp-nav__link">{t("landing.nav.features")}</a>
          <LanguageSwitcher variant="nav" />
          <button type="button" className="lp-nav__login" onClick={() => navigate("/signin")}>
            {t("landing.nav.login")}
          </button>
        </nav>
      </header>

      <Hero
        onGetStarted={() => navigate("/signup")}
        onExplore={() => document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" })}
      />

      <WhatIs />
      <Modes />
      <ProductPreview />
      <Features />
      <Why />
      <Testimonials />
      <FinalCta onGetStarted={() => navigate("/signup")} />
      <Footer />
    </div>
  );
};

export default LandingPage;
