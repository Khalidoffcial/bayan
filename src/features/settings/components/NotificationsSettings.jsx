import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import Toggle from "../../../components/ui/Toggle";
import { NOTIFICATION_ITEMS } from "../../../constants/settingsConfig";

export const NotificationsSettings = () => {
  const { notifications, setNotifications, triggerSave } = useSettings();

  const toggle = (key) =>
    setNotifications((n) => ({ ...n, [key]: !n[key] }));

  const allOn = Object.values(notifications).every(Boolean);
  const toggleAll = () => {
    const val = !allOn;
    setNotifications(
      Object.fromEntries(Object.keys(notifications).map((k) => [k, val]))
    );
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Notifications</h1>
        <p className="section-subtitle">
          Choose what activity you want to be notified about
        </p>
      </div>

      <div className="settings-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            direction: "ltr",
            width: "100%",
          }}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>
            <span className="card-title-icon">◈</span> Activity
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleAll}>
            {allOn ? "Mute all" : "Enable all"}
          </button>
        </div>

        {NOTIFICATION_ITEMS.map((item) => (
          <div className="toggle-row" key={item.key}>
            <div className="toggle-info">
              <div className="toggle-label">{item.label}</div>
              <div className="toggle-desc">{item.desc}</div>
            </div>
            <Toggle
              checked={Boolean(notifications[item.key])}
              onChange={() => toggle(item.key)}
              id={`notif-${item.key}`}
            />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Quiet Hours
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
          Pause all notifications during specific hours.
        </p>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="quiet-from">From</label>
            <input
              id="quiet-from"
              className="field-input"
              type="time"
              defaultValue="22:00"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="quiet-until">Until</label>
            <input
              id="quiet-until"
              className="field-input"
              type="time"
              defaultValue="08:00"
            />
          </div>
        </div>
      </div>

      <div className="actions-row">
        <button className="btn btn-primary" onClick={triggerSave}>
          Save notifications
        </button>
      </div>
    </div>
  );
};

export default React.memo(NotificationsSettings);
