import React, { useMemo, useState } from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import { getTranslation } from "../../../i18n/translations";
import { PRIMARY_COLORS } from "../../../constants/primaryColors";
import { THEMES, FONT_SIZES } from "../../../constants/settingsConfig";
import { FONTS, FONT_CATEGORIES, DEFAULT_FONT, fontById } from "../../../constants/fonts";
import { loadFontFamily } from "../../../utils/loadFont";
import FontPicker from "./FontPicker";

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

      <FontPicker
        value={fontFamily}
        onChange={(id) => {
          loadFontFamily(id);
          setFontFamily(id);
          triggerSave();
        }}
        onReset={() => {
          setFontFamily(DEFAULT_FONT);
          triggerSave();
        }}
      />

      <div className="settings-card">
        <div className="card-title">{t("settings.preview")}</div>
        <div className="preview-box">
          <div className="preview-box-label">{t("settings.preview")}</div>
          <p
            className="preview-text"
            dir={language === "ar" ? "rtl" : "ltr"}
            style={{
              /* inherits the live --font-primary variable — no hardcoded stack */
              fontSize: fontSize === "small" ? 14 : fontSize === "large" ? 17 : 15,
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
