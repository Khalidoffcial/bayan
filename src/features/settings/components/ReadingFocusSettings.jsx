import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import Toggle from "../../../components/ui/Toggle";
import { READING_KEYS, READING_GOALS } from "../../../constants/settingsConfig";

export const ReadingFocusSettings = () => {
  const { reading, setReading, triggerSave } = useSettings();
  const { t } = useTranslation();

  const toggle = (key) => {
    setReading((r) => ({ ...r, [key]: !r[key] }));
    triggerSave();
  };
  const setGoal = (val) => {
    setReading((r) => ({ ...r, readingGoal: val }));
    triggerSave();
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.reading")}</h1>
        <p className="section-subtitle">{t("settings.reading.subtitle")}</p>
      </div>

      <div className="settings-card">
        {READING_KEYS.map((key) => (
          <div className="toggle-row" key={key}>
            <div className="toggle-info">
              <div className="toggle-label">{t(`settings.reading.${key}`)}</div>
              <div className="toggle-desc">{t(`settings.reading.${key}.desc`)}</div>
            </div>
            <Toggle
              checked={Boolean(reading[key])}
              onChange={() => toggle(key)}
              id={`reading-${key}`}
            />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.reading.goal")}</div>
        <div className="goal-cards">
          {READING_GOALS.map((g) => (
            <div
              key={g}
              className={`goal-card ${reading.readingGoal === g ? "active" : ""}`}
              onClick={() => setGoal(g)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setGoal(g)}
            >
              <div className="goal-number">{g}</div>
              <div className="goal-unit">{t("settings.reading.minDay")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReadingFocusSettings);
