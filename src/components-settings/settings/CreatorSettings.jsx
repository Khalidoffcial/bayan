import { useSettings } from "../../context/SettingsContext";

const CREATOR_TOGGLES = [
  { key: "allowComments",     label: "Allow Comments",          desc: "Readers can leave comments on your content" },
  { key: "showAnalytics",     label: "Show Analytics",          desc: "Display view and engagement counts publicly" },
  { key: "publicAuthorProfile", label: "Public Author Profile",  desc: "Your profile is visible in the Explore section" },
  { key: "allowMessages",     label: "Allow Direct Messages",   desc: "Readers can send you private messages" },
];

const Toggle = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <div className="toggle-track"><div className="toggle-thumb" /></div>
  </label>
);

const STATS = [
  { label: "Total Spaces", value: "7", change: "+2 this month" },
  { label: "Total Views",  value: "24.3K", change: "+18% vs last month" },
  { label: "Followers",    value: "412",   change: "+34 this week" },
  { label: "Engagement",   value: "8.4%",  change: "Above average ✓" },
];

export default function CreatorSettings() {
  const { creator, setCreator, triggerSave } = useSettings();
  const toggle = key => setCreator(c => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Creator</h1>
        <p className="section-subtitle">Configure how your content and profile appear to others</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Creator Preferences</div>
        {CREATOR_TOGGLES.map(item => (
          <div className="toggle-row" key={item.key}>
            <div className="toggle-info">
              <div className="toggle-label">{item.label}</div>
              <div className="toggle-desc">{item.desc}</div>
            </div>
            <Toggle checked={creator[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Creator Stats Preview</div>
        <div className="stats-grid">
          {STATS.map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change">{s.change}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Creator Bio</div>
        <div className="field">
          <label className="field-label">Short Bio</label>
          <textarea className="field-input" rows={3} placeholder="Tell readers who you are..."
            style={{ resize:"vertical", lineHeight:1.6 ,width:"500px"}}
            defaultValue="Builder, thinker, and writer. Creating knowledge tools for the Arab world." />
        </div>
        <div className="field">
          <label className="field-label">Website or Link</label>
          <input className="field-input" type="url" placeholder="https://yoursite.com" />
        </div>
      </div>

      <div className="actions-row">
        <button className="btn btn-primary" onClick={triggerSave}>Save creator settings</button>
      </div>
    </div>
  );
}
