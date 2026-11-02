import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "../i18n/useTranslation";
import { useEffect } from "react";
import "../features/landing/landing.css";

/**
 * LegalPage — صفحات /privacy و /terms و /cookies.
 * كل النصوص عبر مفاتيح legal.* في locale files (مترجمة لكل اللغات).
 * المحتوى واقعي ومبني على ما ينفذه النظام فعليًا:
 *  - Firebase (مصادقة + بيانات)، Cloudinary (وسائط)، js-cookie + localStorage (جلسة)،
 *    LibreTranslate (ترجمة اختيارية عند الطلب).
 * التاريخ آخر تحديث ثابت في الأسفل.
 */
const SECTIONS = {
  privacy: [
    { h: "legal.privacy.collect.h", ps: ["legal.privacy.collect.p1", "legal.privacy.collect.p2"] },
    { h: "legal.privacy.account.h", ps: ["legal.privacy.account.p1"] },
    { h: "legal.privacy.content.h", ps: ["legal.privacy.content.p1"] },
    { h: "legal.privacy.third.h", ps: ["legal.privacy.third.p1", "legal.privacy.third.p2"] },
    { h: "legal.privacy.cookies.h", ps: ["legal.privacy.cookies.p1"] },
    { h: "legal.privacy.rights.h", ps: ["legal.privacy.rights.p1"] },
    { h: "legal.privacy.contact.h", ps: ["legal.privacy.contact.p1"] },
  ],
  terms: [
    { h: "legal.terms.account.h", ps: ["legal.terms.account.p1"] },
    { h: "legal.terms.content.h", ps: ["legal.terms.content.p1", "legal.terms.content.p2"] },
    { h: "legal.terms.conduct.h", ps: ["legal.terms.conduct.p1"] },
    { h: "legal.terms.liability.h", ps: ["legal.terms.liability.p1"] },
    { h: "legal.terms.termination.h", ps: ["legal.terms.termination.p1"] },
    { h: "legal.terms.updates.h", ps: ["legal.terms.updates.p1"] },
    { h: "legal.terms.contact.h", ps: ["legal.terms.contact.p1"] },
  ],
  cookies: [
    { h: "legal.cookies.what.h", ps: ["legal.cookies.what.p1"] },
    { h: "legal.cookies.list.h", ps: ["legal.cookies.list.p1"] },
    { h: "legal.cookies.control.h", ps: ["legal.cookies.control.p1"] },
  ],
};

const LegalPage = ({ kind = "privacy" }) => {
  const { t } = useTranslation();
  const sections = SECTIONS[kind] || SECTIONS.privacy;
  const titleKey = `legal.${kind}.title`;

  useEffect(() => { window.scrollTo(0, 0); }, [kind]);

  return (
    <div className="lp legal" dir="auto">
      <Helmet>
        <title>{`${t(titleKey)} | Bayan Space`}</title>
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://bayan-space.vercel.app/${kind}`} />
      </Helmet>

      <header className="legal__header">
        <Link to="/" className="legal__back">← Bayan Space</Link>
        <h1 className="legal__title">{t(titleKey)}</h1>
        <p className="legal__updated">
          {t("legal.lastUpdated")}: 2026-11-02
        </p>
      </header>

      <main className="legal__body">
        {sections.map((s) => (
          <section key={s.h}>
            <h2>{t(s.h)}</h2>
            {s.ps.map((p) => <p key={p}>{t(p)}</p>)}
          </section>
        ))}

        <section>
          <h2>{t("legal.disclaimer.h")}</h2>
          <p>{t("legal.disclaimer.p1")}</p>
        </section>
      </main>

      <footer className="legal__footer">
        <Link to="/" className="lp-btn lp-btn--ghost">{t("legal.backHome")}</Link>
      </footer>
    </div>
  );
};

export const PrivacyPage = () => <LegalPage kind="privacy" />;
export const TermsPage = () => <LegalPage kind="terms" />;
export const CookiesPage = () => <LegalPage kind="cookies" />;
