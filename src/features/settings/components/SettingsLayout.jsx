import React, { useState } from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";
import AppLayout from "../../../components/layout/AppLayout";

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
  { id: "account", labelKey: "settings.account" },
  { id: "appearance", labelKey: "settings.appearance" },
  { id: "language", labelKey: "settings.language" },
  { id: "notifications", labelKey: "settings.notifications" },
  { id: "reading", labelKey: "settings.reading" },
  { id: "creator", labelKey: "settings.creator" },
  { id: "premium", labelKey: "settings.premium" },
  { id: "statistics", labelKey: "settings.statistics" },
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
  const { t } = useTranslation();
  const Panel = PANELS[active] || AppearanceSettings;

  return (
    <AppLayout>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="sidebar-section-label">{t("settings.preferences")}</div>
          <nav className="sidebar-nav">
            {NAV.map((item) => (
              <div
                key={item.id}
                className={`sidebar-item ${active === item.id ? "active" : ""}`}
                onClick={() => setActive(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setActive(item.id)}
              >
                {t(item.labelKey)}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-item" style={{ fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500, color: "var(--text)" }}>
                  {profile.name || t("common.loading")}
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
          <div className={`save-bar ${saveStatus === "failed" ? "save-bar--error" : ""}`} role="status">
            {saveStatus === "saving" && (
              <>
                <div className="save-bar-spinner" aria-hidden="true" />
                <span className="save-bar-msg">{t("settings.saving")}</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span className="save-bar-check" aria-hidden="true">✓</span>
                <span className="save-bar-msg">{t("settings.saved")}</span>
              </>
            )}
            {saveStatus === "failed" && (
              <>
                <span className="save-bar-cross" aria-hidden="true">✕</span>
                <span className="save-bar-msg">{t("settings.saveFailed")}</span>
                <button type="button" className="save-bar-retry" onClick={() => window.dispatchEvent(new CustomEvent("BAYAN_RETRY_SAVE"))}>
                  {t("common.retry")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default React.memo(SettingsLayout);
