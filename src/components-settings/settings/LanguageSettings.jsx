import { useSettings } from "../../context/SettingsContext";

const LANGUAGES = [
  { id: "en", flag: "🇺🇸", name: "English",  native: "English",  dir: "ltr" },
  { id: "ar", flag: "🇸🇦", name: "Arabic",   native: "العربية", dir: "rtl" },
];

export default function LanguageSettings() {
  const { language, setLanguage, triggerSave } = useSettings();

  const handleChange = (id) => {
    setLanguage(id);
    setTimeout(triggerSave, 100);
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Language</h1>
        <p className="section-subtitle">Choose your preferred interface language. Arabic enables full RTL layout.</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Interface Language</div>
        <div className="lang-grid">
          {LANGUAGES.map(lang => (
            <div key={lang.id} className={`lang-card ${language === lang.id ? "active" : ""}`}
              onClick={() => handleChange(lang.id)}>
              <div className="lang-flag">{lang.flag}</div>
              <div>
                <div className="lang-name">{lang.name}</div>
                <div className="lang-native">{lang.native} · {lang.dir.toUpperCase()}</div>
              </div>
              {language === lang.id && (
                <div style={{ marginLeft:"auto", width:18, height:18, borderRadius:"50%", background:"var(--teal)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"white" }}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Content Language</div>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:16 }}>
          Show content in these languages in your feed and Explore section.
        </p>
        {["Arabic", "English", "French"].map(lang => (
          <div className="toggle-row" key={lang}>
            <div className="toggle-info">
              <div className="toggle-label">{lang}</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked={lang !== "French"} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </label>
          </div>
        ))}
      </div>

      {language === "ar" && (
        <div className="preview-box" style={{ direction:"rtl", textAlign:"right" }}>
          <div className="preview-box-label" style={{ textAlign:"right" }}>معاينة النص العربي</div>
          <p className="preview-text" style={{ fontFamily:"Cairo, sans-serif" }}>
            بيان مساحة — منصة للتفكير العميق وبناء المعرفة. اكتشف مساحات فكرية متنوعة، وشارك في نقاشات منظمة، وابنِ قاعدتك المعرفية بشكل منهجي وجميل.
          </p>
        </div>
      )}
    </div>
  );
}
