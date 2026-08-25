import React, { useState } from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import Top from "../../../components/layout/Top";

import AppearanceSettings from "./AppearanceSettings";
import NotificationsSettings from "./NotificationsSettings";
import LanguageSettings from "./LanguageSettings";
import AccountSettings from "./AccountSettings";
import CreatorSettings from "./CreatorSettings";
import ReadingFocusSettings from "./ReadingFocusSettings";
import PremiumSettings from "./PremiumSettings";
import StatisticsSettings from "./StatisticsSettings";

import "../styles/settings.css";

const NAV = [
  { id: "appearance", icon: "◈", label: "Appearance" },
  { id: "notifications", icon: "◎", label: "Notifications" },
  { id: "language", icon: "◐", label: "Language" },
];

const PANELS = {
  account: AccountSettings,
  appearance: AppearanceSettings,
  notifications: NotificationsSettings,
  reading: ReadingFocusSettings,
  creator: CreatorSettings,
  language: LanguageSettings,
  premium: PremiumSettings,
  statistics: StatisticsSettings,
};

export const SettingsLayout = () => {
  const [active, setActive] = useState("appearance");
  const { saveStatus, profile } = useSettings();
  const Panel = PANELS[active] || AppearanceSettings;

  return (
    <>
      <Top />
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="sidebar-section-label">Preferences</div>
          <nav className="sidebar-nav">
            {NAV.map((item) => (
              <div
                key={item.id}
                className={`sidebar-item ${active === item.id ? "active" : ""}`}
                onClick={() => setActive(item.id)}
                role="button"
                tabIndex={0}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-item" style={{ fontSize: 12 }}>
              <span className="sidebar-icon">⬡</span>
              <div>
                <div style={{ fontWeight: 500, color: "var(--text)" }}>
                  {profile.name || "User"}
                </div>
                <div style={{ color: "var(--text3)", fontSize: 11 }}>
                  @{profile.username || "user"}
                </div>
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
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid var(--gold)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                <span className="save-bar-msg">Saving changes...</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--teal)", fontSize: 16 }}>✓</span>
                <span className="save-bar-msg">Changes saved</span>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(SettingsLayout);
