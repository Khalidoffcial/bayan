import React from "react";

export const ProfileStats = ({ followers, following }) => {
  return (
    <div className="profile-stats">
      <div className="stat-item">
        <span className="stat-value">{followers || 0}</span>
        <span className="stat-label">Followers</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{following || 0}</span>
        <span className="stat-label">Following</span>
      </div>
    </div>
  );
};

export default React.memo(ProfileStats);
