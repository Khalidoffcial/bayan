import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";

export const ProfileStats = ({ followers, following }) => {
  const { t } = useTranslation();
  return (
    <div className="profile-stats">
      <div className="stat-item">
        <span className="stat-value">{followers || 0}</span>
        <span className="stat-label">{t("profile.followers")}</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{following || 0}</span>
        <span className="stat-label">{t("profile.following")}</span>
      </div>
    </div>
  );
};

export default React.memo(ProfileStats);
