import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import Toggle from "../../../components/ui/Toggle";
import { LANGUAGES } from "../../../constants/settingsConfig";

export const LanguageSettings = () => {
  const { language, setLanguage, triggerSave } = useSettings();

  const handleChange = (id) => {
    setLanguage(id);
    setTimeout(triggerSave, 100);
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Language</h1>
        <p className="section-subtitle">
          Choose your preferred interface language. Arabic enables full RTL layout.
        </p>
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Interface Language
        </div>
        <div className="option-grid">
          {LANGUAGES.map((lang) => (
            <div
              key={lang.id}
              className={`option-card ${language === lang.id ? "active" : ""}`}
              onClick={() => handleChange(lang.id)}
            >
              <div className="option-card-icon">{lang.flag}</div>
              <div className="option-card-label">{lang.name}</div>
              <div className="option-card-desc">
                {lang.native} · {lang.dir.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Content Language
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
          Show content in these languages in your feed and Explore section.
        </p>
        {["Arabic", "English", "French"].map((lang) => (
          <div className="toggle-row" key={lang}>
            <div className="toggle-info">
              <div className="toggle-label">{lang}</div>
            </div>
            <Toggle
              checked={lang !== "French"}
              onChange={() => { }}
              id={`lang-toggle-${lang}`}
            />
          </div>
        ))}
      </div>

      {language === "ar" && (
        <div className="preview-box" style={{ direction: "rtl", textAlign: "right" }}>
          <div className="preview-box-label" style={{ textAlign: "right" }}>
            معاينة النص العربي
          </div>
          <p className="preview-text" style={{ fontFamily: "Cairo, sans-serif" }}>
            بيان مساحة — منصة للتفكير العميق وبناء المعرفة. اكتشف مساحات فكرية
            متنوعة، وشارك في نقاشات منظمة، وابنِ قاعدتك المعرفية بشكل منهجي وجميل.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(LanguageSettings);
