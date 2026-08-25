import React from "react";

export const ProfileTabs = ({ activeTab, onTabChange }) => {
  const tabs = ["Posts", "Articles", "Novels"];

  return (
    <div className="profile-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-item ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default React.memo(ProfileTabs);
