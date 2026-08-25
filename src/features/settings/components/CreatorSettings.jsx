import React from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import Toggle from "../../../components/ui/Toggle";
import { CREATOR_TOGGLES } from "../../../constants/settingsConfig";

const STATS = [
  { label: "Total Spaces", value: "7", change: "+2 this month" },
  { label: "Total Views", value: "24.3K", change: "+18% vs last month" },
  { label: "Followers", value: "412", change: "+34 this week" },
  { label: "Engagement", value: "8.4%", change: "Above average ✓" },
];

export const CreatorSettings = () => {
  const { creator, setCreator, triggerSave } = useSettings();
  const toggle = (key) => setCreator((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Creator</h1>
        <p className="section-subtitle">
          Configure how your content and profile appear to others
        </p>
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Creator Preferences
        </div>
        {CREATOR_TOGGLES.map((item) => (
          <div className="toggle-row" key={item.key}>
            <div className="toggle-info">
              <div className="toggle-label">{item.label}</div>
              <div className="toggle-desc">{item.desc}</div>
            </div>
            <Toggle
              checked={Boolean(creator[item.key])}
              onChange={() => toggle(item.key)}
              id={`creator-toggle-${item.key}`}
            />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Creator Stats Preview
        </div>
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {STATS.map((s) => (
            <div className="stat-card" key={s.label} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div className="stat-value" style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              <div className="stat-label" style={{ fontSize: 12, color: "var(--text3)" }}>{s.label}</div>
              <div className="stat-change" style={{ fontSize: 11, color: "var(--teal)" }}>{s.change}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span> Creator Bio
        </div>
        <div className="field">
          <label className="field-label" htmlFor="creator-bio-input">Short Bio</label>
          <textarea
            id="creator-bio-input"
            className="field-input"
            rows={3}
            placeholder="Tell readers who you are..."
            style={{ resize: "vertical", lineHeight: 1.6, width: "100%", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
            defaultValue="Builder, thinker, and writer. Creating knowledge tools for the Arab world."
          />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="creator-website-input">Website or Link</label>
          <input
            id="creator-website-input"
            className="field-input"
            type="url"
            placeholder="https://yoursite.com"
            style={{ width: "100%", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
          />
        </div>
      </div>

      <div className="actions-row">
        <button className="btn btn-primary" onClick={triggerSave}>
          Save creator settings
        </button>
      </div>
    </div>
  );
};

export default React.memo(CreatorSettings);
