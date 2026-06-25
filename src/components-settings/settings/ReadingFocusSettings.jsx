import { useSettings } from "../../context/SettingsContext";

const TOGGLES = [
  { key: "focusMode",                   label: "Focus Mode",                        desc: "Hide sidebar and distractions while reading" },
  { key: "hideLikeCounts",              label: "Hide Like Counts",                  desc: "Reduce social pressure, see only your own likes" },
  { key: "hideNotificationsWhileReading", label: "Silence Notifications While Reading", desc: "Block notification badges during reading sessions" },
  { key: "minimalUI",                   label: "Minimal UI",                        desc: "Strip down the interface to content only" },
  { key: "autoReadingMode",             label: "Auto Reading Mode",                 desc: "Automatically enter focus when you open an article" },
];

const GOALS = [
  { value: 15, label: "Quick read" },
  { value: 30, label: "Daily habit" },
  { value: 60, label: "Deep work" },
];

const Toggle = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <div className="toggle-track"><div className="toggle-thumb" /></div>
  </label>
);

export default function ReadingFocusSettings() {
  const { reading, setReading, triggerSave } = useSettings();

  const toggle = key => setReading(r => ({ ...r, [key]: !r[key] }));
  const setGoal = val => setReading(r => ({ ...r, readingGoal: val }));

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Reading & Focus</h1>
        <p className="section-subtitle">Tune your reading environment for deep, distraction-free work</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Focus Preferences</div>
        {TOGGLES.map(item => (
          <div className="toggle-row" key={item.key}>
            <div className="toggle-info">
              <div className="toggle-label">{item.label}</div>
              <div className="toggle-desc">{item.desc}</div>
            </div>
            <Toggle checked={reading[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Daily Reading Goal</div>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:14 }}>Set a daily reading target to build a consistent habit.</p>
        <div className="goal-grid">
          {GOALS.map(g => (
            <div key={g.value} className={`goal-card ${reading.readingGoal === g.value ? "active" : ""}`} onClick={() => setGoal(g.value)}>
              <div className="goal-value">{g.value}</div>
              <div className="goal-unit">min / day</div>
              <div className="goal-unit" style={{ marginTop:4 }}>{g.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> This Week</div>
        <div style={{ display:"flex", gap:16, marginBottom:8 }}>
          {[60,45,80,30,90,55,40].map((h,i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6,direction:"ltr" }}>
              <div style={{ width:"100%", height: Math.round(h * 0.7) + "px", background: h > 70 ? "var(--teal)" : "var(--surface)", borderRadius:"3px 3px 0 0", transition:"background 0.2s" }} />
              <span style={{ fontSize:10, color:"var(--text3)" }}>{["M","T","W","T","F","S","S"][i]}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize:12, color:"var(--text3)" }}>Average this week: <span style={{ color:"var(--teal)" }}>57 min/day</span></p>
      </div>

      <div className="actions-row">
        <button className="btn btn-primary" onClick={triggerSave}>Save preferences</button>
      </div>
    </div>
  );
}
