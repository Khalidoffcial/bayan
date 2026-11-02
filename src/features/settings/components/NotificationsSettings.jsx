import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import Toggle from "../../../components/ui/Toggle";
import { NOTIFICATION_KEYS } from "../../../constants/settingsConfig";

export const NotificationsSettings = () => {
  const { notifications, setNotifications, triggerSave } = useSettings();
  const { t } = useTranslation();

  const toggle = (key) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
    triggerSave();
  };

  const allOn = Object.values(notifications).every(Boolean);
  const toggleAll = () => {
    const val = !allOn;
    setNotifications(Object.fromEntries(Object.keys(notifications).map((k) => [k, val])));
    triggerSave();
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.notifications")}</h1>
        <p className="section-subtitle">{t("settings.notifications.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="card-row-between">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {t("settings.notifications")}
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleAll}>
            {t("settings.notifications.all")}
          </button>
        </div>

        {NOTIFICATION_KEYS.map((key) => (
          <div className="toggle-row" key={key}>
            <div className="toggle-info">
              <div className="toggle-label">{t(`settings.notif.${key}`)}</div>
              <div className="toggle-desc">{t(`settings.notif.${key}.desc`)}</div>
            </div>
            <Toggle
              checked={Boolean(notifications[key])}
              onChange={() => toggle(key)}
              id={`notif-${key}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(NotificationsSettings);
