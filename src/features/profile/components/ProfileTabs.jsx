import React from "react";
import { PROFILE_TABS } from "../services/profileContent.service";
import { useTranslation } from "../../../i18n/useTranslation";

/**
 * Unified profile content tabs. "الكل" is the default tab and shows every
 * kind the profile owner authored. Tab labels carry live counts when the
 * server provides them.
 */
export const ProfileTabs = ({ activeTab, onTabChange, counts = {} }) => {
  const { t } = useTranslation();
  return (
    <div className="profile-tabs">
      {PROFILE_TABS.map(({ key, label }) => {
        const count = counts[key];
        const hasCount = Number.isFinite(Number(count)) && Number(count) > 0;

        return (
          <button
            key={key}
            className={`tab-item ${activeTab === key ? "active" : ""}`}
            onClick={() => onTabChange(key)}
          >
            {t(`profile.tab.${key}`)}
            {hasCount && <span className="tab-count">{counts[key]}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(ProfileTabs);
