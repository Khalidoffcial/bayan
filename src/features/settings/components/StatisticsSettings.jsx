import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";

export const StatisticsSettings = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.statistics")}</h1>
        <p className="section-subtitle">{t("settings.statistics.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.statistics.empty.title")}</div>
        <p className="card-desc">{t("settings.statistics.empty.desc")}</p>
      </div>
    </div>
  );
};

export default React.memo(StatisticsSettings);
