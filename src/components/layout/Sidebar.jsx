/**
 * Sidebar — main navigation.
 *
 * Icons come from the central Lucide registry (focusIcons.js) — no PNG
 * swaps, no emoji. The active state colors the glyph with the brand blue
 * via CSS (.sidebar-item.active .nav-icon), so the component itself
 * stays direction-agnostic (RTL/LTR handled in CSS).
 */
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles/sidebar.css";
import { useTranslation } from "../../i18n/useTranslation";
import { NAV_ICONS, MenuIcon } from "../../features/focus-space/constants/focusIcons";

const Sidebar = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();

  const channels = [
    { key: "nav.all", icon: NAV_ICONS.all, path: "/", match: (p) => p === "/" || p === "/all" },
    // Bayan Flow — immersive vertical discovery (full-screen, after All)
    { key: "nav.flow", icon: NAV_ICONS.flow, path: "/flow", match: (p) => p === "/flow" },
    { key: "nav.posts", icon: NAV_ICONS.posts, path: "/posts", match: (p) => p === "/posts" },
    { key: "nav.articles", icon: NAV_ICONS.articles, path: "/articles", match: (p) => p === "/articles" },
    { key: "nav.novels", icon: NAV_ICONS.novels, path: "/novels", match: (p) => p === "/novels" },
    { key: "nav.books", icon: NAV_ICONS.books, path: "/books", match: (p) => p.startsWith("/books") },
    { key: "nav.exams", icon: NAV_ICONS.exams, path: "/exams", match: (p) => p === "/exams" },
    // Focus Space — مساحة الدراسة الغامرة، مباشرة بعد Exams (per spec)
    { key: "nav.focus", icon: NAV_ICONS.focus, path: "/focus", match: (p) => p === "/focus" },
  ];

  return (
    <>
      <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label={t("aria.menu")}>
        <MenuIcon size={22} aria-hidden />
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
            const Icon = channel.icon;
            return (
              <Link
                key={channel.key}
                to={path}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon" aria-hidden>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
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
          <span className="nav-icon" aria-hidden>
            <NAV_ICONS.settings size={20} strokeWidth={1.75} />
          </span>
          <span>{t("nav.settings")}</span>
        </Link>
      </div>
    </>
  );
};

export default React.memo(Sidebar);
