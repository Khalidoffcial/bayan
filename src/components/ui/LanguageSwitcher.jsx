import React, { useState, useEffect, useRef } from "react";
import { useSettings } from "../../contexts/SettingsContext";
import { getTranslation } from "../../i18n/translations";
import { LANGUAGES } from "../../constants/settingsConfig";
import "./LanguageSwitcher.css";

/**
 * LanguageSwitcher — قائمة لغات مدمجة.
 * التغيير يمر عبر SettingsContext → يحدّث اللغة والاتجاه والخطوط فورًا،
 * ويُحفظ (localStorage + السيرفر للمسجل) ليبقى الاختيار في الزيارات التالية.
 */
const LanguageSwitcher = ({ variant = "nav" }) => {
  const { language, setLanguage } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const t = (key) => getTranslation(language, key);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  return (
    <div className={`lang-switcher lang-switcher--${variant}`} ref={ref}>
      <button
        type="button"
        className="lang-switcher__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("landing.language.switch")}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 12h18M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="lang-switcher__current">{current.id.toUpperCase()}</span>
      </button>

      {open && (
        <ul className="lang-switcher__menu" role="listbox" aria-label={t("landing.language.switch")}>
          {LANGUAGES.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                role="option"
                aria-selected={l.id === language}
                className={`lang-switcher__option ${l.id === language ? "is-active" : ""}`}
                onClick={() => { setLanguage(l.id); setOpen(false); }}
              >
                <span className="lang-switcher__name">{l.name}</span>
                {l.id === language && <span className="lang-switcher__check" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
