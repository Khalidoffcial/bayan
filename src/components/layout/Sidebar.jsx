import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles/sidebar.css";

// Assets
import menu from "../../assets/icons/menu.png";
import setting from "../../assets/icons/setting.png";
import settingOutline from "../../assets/icons/settingoutline.png";
import PostIcon from "../../assets/icons/post.png";
import PostIconOutline from "../../assets/icons/PostOutline.png";
import articleIcon from "../../assets/icons/article.png";
import articleOutline from "../../assets/icons/articleOutline.png";
import novelIcon from "../../assets/icons/novel.png";
import novelOutline from "../../assets/icons/novelOutline.png";
import examIcon from "../../assets/icons/exam.png";
import examOutline from "../../assets/icons/examOutline.png";
import allIcon from "../../assets/icons/all.png";
import allOutline from "../../assets/icons/allOutline.png";

const Sidebar = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const channels = [
    { name: "Posts", activeIcon: PostIcon, inactiveIcon: PostIconOutline },
    { name: "Articles", activeIcon: articleIcon, inactiveIcon: articleOutline },
    { name: "Novels", activeIcon: novelIcon, inactiveIcon: novelOutline },
    { name: "Exams", activeIcon: examIcon, inactiveIcon: examOutline },
  ];

  return (
    <>
      <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
        <img src={menu} alt="Menu" />
      </button>

      {sidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <ul className="sidebar-list">
          <Link
            to="/"
            className={`sidebar-item ${location.pathname === "/" ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span>All</span>
            <img
              src={location.pathname === "/" ? allIcon : allOutline}
              alt="All"
              className="settings-icon"
            />
          </Link>

          {channels.map((channel) => {
            const path = `/${channel.name.toLowerCase()}`;
            const isActive = location.pathname === path;
            return (
              <Link
                key={channel.name}
                to={path}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span>{channel.name}</span>
                <img
                  src={isActive ? channel.activeIcon : channel.inactiveIcon}
                  alt={channel.name}
                  className="settings-icon"
                />
              </Link>
            );
          })}
        </ul>

        <Link
          to="/settings"
          className={`sidebar-item settings-link ${location.pathname === "/settings" ? "active" : ""}`}
          onClick={() => setSidebarOpen(false)}
          >
          <span>Settings</span>
          <img
            src={location.pathname === "/settings" ? setting : settingOutline}
            alt="Settings"
            className="settings-icon"
          />
        </Link>
      </div>
    </>
  );
};

export default React.memo(Sidebar);
