import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles/sidebar.css";
import { useTranslation } from "../../i18n/useTranslation";

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
  const { t } = useTranslation();

  const channels = [
    { key: "nav.all", path: "/", activeIcon: allIcon, inactiveIcon: allOutline, match: (p) => p === "/" || p === "/all" },
    { key: "nav.posts", path: "/posts", activeIcon: PostIcon, inactiveIcon: PostIconOutline, match: (p) => p === "/posts" },
    { key: "nav.articles", path: "/articles", activeIcon: articleIcon, inactiveIcon: articleOutline, match: (p) => p === "/articles" },
    { key: "nav.novels", path: "/novels", activeIcon: novelIcon, inactiveIcon: novelOutline, match: (p) => p === "/novels" },
    { key: "nav.exams", path: "/exams", activeIcon: examIcon, inactiveIcon: examOutline, match: (p) => p === "/exams" },
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
        {/* اللوجو في الـ Topbar (تعليمات الجولة الحالية) — لا نسخة هنا */}
        <ul className="sidebar-list">
          {channels.map((channel) => {
            const path = channel.path;
            const isActive = channel.match(location.pathname);
            return (
              <Link
                key={channel.key}
                to={path}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <img
                  src={isActive ? channel.activeIcon : channel.inactiveIcon}
                  alt=""
                  className="settings-icon"
                />
                <span>{t(channel.key)}</span>
              </Link>
            );
          })}
        </ul>

        <Link
          to="/settings"
          className={`sidebar-item settings-link ${location.pathname === "/settings" ? "active" : ""}`}
          onClick={() => setSidebarOpen(false)}
          >
          <img
            src={location.pathname === "/settings" ? setting : settingOutline}
            alt=""
            className="settings-icon"
          />
          <span>{t("nav.settings")}</span>
        </Link>
      </div>
    </>
  );
};

export default React.memo(Sidebar);
