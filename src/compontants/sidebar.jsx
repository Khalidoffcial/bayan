import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

// Menu
import menu from "../icons/menu.png";

// Settings
import setting from "../icons/setting.png";
import settingOutline from "../icons/settingoutline.png";

// Posts
import PostIcon from "../icons/idea.png";
import PostIconOutline from "../icons/PostOutline.png";

// Articles
import articleIcon from "../icons/article.png";
import articleOutline from "../icons/articleOutline.png";

// Novels
import novelIcon from "../icons/novel.png";
import novelOutline from "../icons/novelOutline.png";

// Exams
import examIcon from "../icons/exam.png";
import examOutline from "../icons/examOutline.png";

// All
import allIcon from "../icons/all.png";
import allOutline from "../icons/allOutline.png";

const Sidebar = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const channels = [
    {
      name: "Posts",
      activeIcon: PostIcon,
      inactiveIcon: PostIconOutline,
    },
    {
      name: "Articles",
      activeIcon: articleIcon,
      inactiveIcon: articleOutline,
    },
    {
      name: "Novels",
      activeIcon: novelIcon,
      inactiveIcon: novelOutline,
    },
    {
      name: "Exams",
      activeIcon: examIcon,
      inactiveIcon: examOutline,
    },
  ];

  return (
    <>
      <button
        className="menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        <img src={menu} alt="Menu" />
      </button>

      {sidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <ul className="sidebar-list">
          <Link
            to="/"
            className={`sidebar-item ${
              location.pathname === "/" ? "active" : ""
            }`}
            onClick={() => setSidebarOpen(false)}
          >

            <img
              src={location.pathname === "/" ? allIcon : allOutline}
              alt="All"
              className="settings-icon"
              />
              <span>All</span>
          </Link>

          {channels.map((channel) => {
            const path = `/${channel.name.toLowerCase()}`;
            const isActive = location.pathname === path;

            return (
              <Link
                key={channel.name}
                to={path}
                className={`sidebar-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() => setSidebarOpen(false)}
              >

                <img
                  src={
                    isActive
                    ? channel.activeIcon
                    : channel.inactiveIcon
                  }
                  alt={channel.name}
                  className="settings-icon"
                  />
                  <span>{channel.name}</span>
              </Link>
            );
          })}
        </ul>

        <Link
          to="/settings"
          className={`sidebar-item settings-link ${
            location.pathname === "/settings"
              ? "active"
              : ""
          }`}
          onClick={() => setSidebarOpen(false)}
        >

          <img
            src={
              location.pathname === "/settings"
              ? setting
              : settingOutline
            }
            alt="Settings"
            className="settings-icon"
            />
            <span>Settings</span>
        </Link>
      </div>
    </>
  );
};

export default Sidebar;