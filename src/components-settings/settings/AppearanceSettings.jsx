import { useSettings } from "../../context/SettingsContext";

const THEMES = [
  { id: "light", icon: "☀️", label: "Light", desc: "Clean & bright" },
  { id: "dark",  icon: "🌑", label: "Dark",  desc: "Easy on eyes" },
  { id: "system",icon: "💻", label: "System",desc: "Matches OS" },
];
const SIZES = ["Small", "Medium", "Large"];
const FONTS = [
  { id: "Inter",    sample: "Aa", desc: "Modern & clean" },
  { id: "Poppins",  sample: "Aa", desc: "Rounded & friendly" },
  { id: "Cairo",    sample: "أأ", desc: "Arabic support" },
];

export default function AppearanceSettings() {
  const { theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily, triggerSave } = useSettings();

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Appearance</h1>
        <p className="section-subtitle">Personalize how Bayan Space looks and feels</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Color Theme</div>
        <div className="option-grid">
          {THEMES.map(t => (
            <div key={t.id} className={`option-card ${theme === t.id ? "active" : ""}`} onClick={() => setTheme(t.id)}>
              <div className="option-card-icon">{t.icon}</div>
              <div className="option-card-label">{t.label}</div>
              <div className="option-card-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Font Size</div>
        <div className="segment-control">
          {SIZES.map(s => (
            <button key={s} className={`segment-btn ${fontSize === s.toLowerCase() ? "active" : ""}`}
              onClick={() => setFontSize(s.toLowerCase())}>{s}</button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Font Family</div>
        <div className="font-cards">
          {FONTS.map(f => (
            <div key={f.id} className={`font-card ${fontFamily === f.id ? "active" : ""}`}
              onClick={() => setFontFamily(f.id)} style={{ fontFamily: f.id }}>
              <div className="font-card-sample">{f.sample}</div>
              <div className="option-card-label" style={{ fontFamily: f.id }}>{f.id}</div>
              <div className="font-card-name">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Preview</div>
        <div className="preview-box">
          <div className="preview-box-label">Live preview</div>
          <p className="preview-text" style={{ fontFamily: fontFamily + ", sans-serif", fontSize: fontSize === "small" ? 13 : fontSize === "large" ? 17 : 15 }}>
            <strong>Bayan Space</strong> is a distraction-free environment for deep thinking. This is how your reading experience will look across all articles, notes, and knowledge hubs.
            <br /><br />
            <span style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", display: "block", textAlign: "right", color: "var(--text2)", fontSize: "0.9em" }}>
              بيان مساحة للتفكير العميق والمعرفة
            </span>
          </p>
        </div>
        <div className="actions-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={triggerSave}>Save appearance</button>
        </div>
      </div>
    </div>
  );
}
