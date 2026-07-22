import { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import "../styles/settings.css";
import Top from '../components/top.jsx';

import AccountSettings      from "../components-settings/settings/AccountSettings.jsx";
import AppearanceSettings   from "../components-settings/settings/AppearanceSettings.jsx";
import NotificationsSettings from "../components-settings/settings/NotificationsSettings.jsx";
import ReadingFocusSettings from "../components-settings/settings/ReadingFocusSettings.jsx";
import CreatorSettings      from "../components-settings/settings/CreatorSettings.jsx";
import LanguageSettings     from "../components-settings/settings/LanguageSettings.jsx";
import PremiumSettings      from "../components-settings/settings/PremiumSettings.jsx";
import StatisticsSettings   from "../components-settings/settings/StatisticsSettings.jsx";

const NAV = [
  // { id: "account",       icon: "◉", label: "Account" },
  { id: "appearance",    icon: "◈", label: "Appearance" },
  { id: "notifications", icon: "◎", label: "Notifications" },
  // { id: "reading",       icon: "◇", label: "Reading & Focus" },
  // { id: "creator",       icon: "◆", label: "Creator" },
  { id: "language",      icon: "◐", label: "Language" },
  // { id: "premium",       icon: "✦", label: "Premium", badge: "PRO" },
  // { id: "statistics",    icon: "▦", label: "Statistics" },
];

const PANELS = {
  account:       AccountSettings,
  appearance:    AppearanceSettings,
  notifications: NotificationsSettings,
  // reading:       ReadingFocusSettings,
  // creator:       CreatorSettings,
  language:      LanguageSettings,
  // premium:       PremiumSettings,
  // statistics:    StatisticsSettings,
};

export default function Settings() {
  const [active, setActive] = useState("appearance");
  const { saveStatus, profile } = useSettings();
  const Panel = PANELS[active];

  return (
    <>
    <Top/>
    <div className="settings-layout">
      <aside className="settings-sidebar">

        <div className="sidebar-section-label">Preferences</div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <div key={item.id} className={`sidebar-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}>
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item" style={{ fontSize:12 }}>
            <span className="sidebar-icon">⬡</span>
            <div>
              <div style={{ fontWeight:500, color:"var(--text)" }}>{profile.name}</div>
              <div style={{ color:"var(--text3)", fontSize:11 }}>@{profile.username}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="settings-content">
        <Panel />
      </main>

      {saveStatus && (
        <div className="save-bar">
          {saveStatus === "saving" ? (
            <>
              <div style={{ width:14, height:14, border:"2px solid var(--gold)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.6s linear infinite" }} />
              <span className="save-bar-msg">Saving changes...</span>
            </>
          ) : (
            <>
              <span style={{ color:"var(--teal)", fontSize:16 }}>✓</span>
              <span className="save-bar-msg">Changes saved</span>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
    </>
  );
}
