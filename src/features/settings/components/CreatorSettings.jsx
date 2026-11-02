import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import Toggle from "../../../components/ui/Toggle";
import { CREATOR_KEYS } from "../../../constants/settingsConfig";

export const CreatorSettings = () => {
  const { creator, setCreator, triggerSave } = useSettings();
  const { t } = useTranslation();

  const toggle = (key) => {
    setCreator((c) => ({ ...c, [key]: !c[key] }));
    triggerSave();
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.creator")}</h1>
        <p className="section-subtitle">{t("settings.creator.subtitle")}</p>
      </div>

      <div className="settings-card">
        {CREATOR_KEYS.map((key) => (
          <div className="toggle-row" key={key}>
            <div className="toggle-info">
              <div className="toggle-label">{t(`settings.creator.${key}`)}</div>
              <div className="toggle-desc">{t(`settings.creator.${key}.desc`)}</div>
            </div>
            <Toggle
              checked={Boolean(creator[key])}
              onChange={() => toggle(key)}
              id={`creator-${key}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CreatorSettings);
