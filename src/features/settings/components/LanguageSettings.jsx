import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import { LANGUAGES } from "../../../constants/settingsConfig";
import { getLocaleCompleteness } from "../../../i18n/translations";
import { getDirection } from "../../../utils/helpers";

const COMPLETENESS_THRESHOLD = 0.999;

export const LanguageSettings = () => {
  const { language, setLanguage, triggerSave } = useSettings();
  const { t } = useTranslation();

  const handleChange = (id) => {
    setLanguage(id);
    triggerSave();
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.language")}</h1>
        <p className="section-subtitle">{t("settings.language.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.interfaceLanguage")}</div>
        <div className="option-grid">
          {LANGUAGES.map((lang) => {
            // نسبة الاكتمال تُحسب داخليًا مقابل en.js —
            // اللغة الناقصة تُوسم صراحة ولا تُدّعى أنها مدعومة بالكامل.
            const completeness = getLocaleCompleteness(lang.id);
            const complete = completeness >= COMPLETENESS_THRESHOLD;
            return (
              <div
                key={lang.id}
                className={`option-card ${language === lang.id ? "active" : ""}`}
                onClick={() => handleChange(lang.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleChange(lang.id)}
              >
                <div className="option-card-label">{lang.name}</div>
                <div className="option-card-desc">
                  {lang.dir.toUpperCase()}
                  {!complete &&
                    ` · ${t("settings.language.partial")} (${Math.round(completeness * 100)}%)`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LanguageSettings);
