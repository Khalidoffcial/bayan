import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import Toggle from "../../../components/ui/Toggle";
import { READING_TOGGLES, READING_GOALS } from "../../../constants/settingsConfig";

export const ReadingFocusSettings = () => {
  const { reading, setReading, triggerSave } = useSettings();

  const toggle = (key) => setReading((r) => ({ ...r, [key]: !r[key] }));
  const setGoal = (val) => setReading((r) => ({ ...r, readingGoal: val }));

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Reading & Focus</h1>
        <p className="section-subtitle">
          Tune your reading environment for deep, distraction-free work
        </p>
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Focus Preferences
        </div>
        {READING_TOGGLES.map((item) => (
          <div className="toggle-row" key={item.key}>
            <div className="toggle-info">
              <div className="toggle-label">{item.label}</div>
              <div className="toggle-desc">{item.desc}</div>
            </div>
            <Toggle
              checked={Boolean(reading[item.key])}
              onChange={() => toggle(item.key)}
              id={`reading-toggle-${item.key}`}
            />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Daily Reading Goal
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
          Set a daily reading target to build a consistent habit.
        </p>
        <div className="goal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {READING_GOALS.map((g) => (
            <div
              key={g.value}
              className={`goal-card ${reading.readingGoal === g.value ? "active" : ""
                }`}
              onClick={() => setGoal(g.value)}
              style={{
                padding: 16,
                border: reading.readingGoal === g.value ? "1px solid var(--teal)" : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
                cursor: "pointer",
                background: reading.readingGoal === g.value ? "var(--teal-dim)" : "transparent",
              }}
            >
              <div className="goal-value" style={{ fontSize: 24, fontWeight: 700 }}>{g.value}</div>
              <div className="goal-unit" style={{ fontSize: 12, color: "var(--text3)" }}>min / day</div>
              <div className="goal-unit" style={{ fontSize: 12, marginTop: 4 }}>
                {g.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button className="btn btn-primary" onClick={triggerSave}>
          Save preferences
        </button>
      </div>
    </div>
  );
};

export default React.memo(ReadingFocusSettings);
