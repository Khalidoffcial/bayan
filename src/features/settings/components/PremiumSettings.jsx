import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";

const FEATURE_KEYS = [
  "aiAssistant",
  "aiSummaries",
  "analytics",
  "unlimitedSpaces",
  "customThemes",
  "monetization",
];

export const PremiumSettings = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.premium")}</h1>
        <p className="section-subtitle">{t("settings.premium.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.premium.currentPlan")}</div>
        <p className="card-desc">{t("settings.premium.currentPlan.desc")}</p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.premium.features")}</div>
        <p className="card-desc">{t("settings.premium.features.desc")}</p>
        <div className="feature-list">
          {FEATURE_KEYS.map((key) => (
            <div className="feature-item" key={key}>
              <div className="feature-item-title">{t(`settings.premium.${key}`)}</div>
              <div className="feature-item-desc">{t(`settings.premium.${key}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PremiumSettings);
