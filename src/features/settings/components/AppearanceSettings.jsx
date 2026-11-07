import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import { getTranslation } from "../../../i18n/translations";
import { PRIMARY_COLORS } from "../../../constants/primaryColors";
import { THEMES, FONT_SIZES, FONT_FAMILIES } from "../../../constants/settingsConfig";
import { loadFontFamily } from "../../../utils/loadFont";

export const AppearanceSettings = () => {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    primaryColor,
    setPrimaryColor,
    triggerSave,
  } = useSettings();
  const { t, language } = useTranslation();

  const pickColor = (value) => {
    setPrimaryColor(value);
    triggerSave();
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.appearance")}</h1>
        <p className="section-subtitle">{t("settings.appearance.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.theme")}</div>
        <div className="option-grid">
          {THEMES.map((id) => (
            <div
              key={id}
              className={`option-card ${theme === id ? "active" : ""}`}
              onClick={() => { setTheme(id); triggerSave(); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setTheme(id)}
            >
              <div className="option-card-label">{t(`settings.theme.${id}`)}</div>
              <div className="option-card-desc">{t(`settings.theme.${id}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.primaryColor")}</div>
        <p className="card-desc">{t("settings.primaryColor.desc")}</p>
        <div className="color-swatches">
          {PRIMARY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`color-swatch ${primaryColor.toLowerCase() === c.value.toLowerCase() ? "active" : ""}`}
              style={{ background: c.value }}
              onClick={() => pickColor(c.value)}
              aria-label={c.label}
              title={c.label}
            />
          ))}
          <label className={`color-swatch color-swatch--custom ${!PRIMARY_COLORS.some((c) => c.value.toLowerCase() === primaryColor.toLowerCase()) ? "active" : ""}`}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => pickColor(e.target.value)}
              aria-label={t("settings.customColor")}
            />
            <span>+</span>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.fontSize")}</div>
        <div className="segment-control">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              className={`segment-btn ${fontSize === s ? "active" : ""}`}
              onClick={() => { setFontSize(s); triggerSave(); }}
            >
              {t(`settings.font.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.fontFamily")}</div>
        <div className="font-cards">
          {FONT_FAMILIES.map((f) => (
            <div
              key={f.id}
              className={`font-card ${fontFamily === f.id ? "active" : ""}`}
              onClick={() => { loadFontFamily(f.id); setFontFamily(f.id); triggerSave(); }}
              style={{ fontFamily: f.id }}
            >
              <div className="font-card-sample">{f.sample}</div>
              <div className="option-card-label" style={{ fontFamily: f.id }}>
                {f.id}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.preview")}</div>
        <div className="preview-box">
          <div className="preview-box-label">{t("settings.preview")}</div>
          <p
            className="preview-text"
            dir={language === "ar" ? "rtl" : "ltr"}
            style={{
              fontFamily: `${fontFamily}, sans-serif`,
              fontSize: fontSize === "small" ? 13 : fontSize === "large" ? 17 : 15,
            }}
          >
            {language === "ar"
              ? "بيان — مساحة للتفكير العميق والمعرفة. كده هتقرأ كل المقالات والأفكار والروايات بنفس الشكل اللي هيتطبق في كل صفحات الموقع."
              : getTranslation(language, "settings.previewText", null, "")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppearanceSettings);
