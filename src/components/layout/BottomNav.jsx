/**
 * BottomNav — mobile fixed bottom navigation bar.
 *
 * Replaces the slide-in sidebar on small screens (same 900px breakpoint the
 * sidebar already used). Every Sidebar destination is present — none removed,
 * none invented: identical routes, identical labels, identical match rules.
 *
 * Nine destinations don't fit a 360px viewport at comfortable touch sizes,
 * so the bar scrolls horizontally (momentum + hidden scrollbar + scroll
 * snapping), the standard iOS "tray" pattern. Settings stays last, exactly
 * like the desktop sidebar.
 *
 * • <nav>+<ul> semantics, aria-current for the active route.
 * • RTL/LTR purely via CSS (flex row follows direction automatically).
 * • Zero CLS: constant height from first paint; workspace reserves it.
 * • safe-area-inset-bottom for iPhone home indicator / Android gestures.
 */
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles/bottomNav.css";
import { useTranslation } from "../../i18n/useTranslation";
import { NAV_ICONS } from "../../features/focus-space/constants/focusIcons";
import { FLOW_NAME } from "../../features/flow";

/* Same channel list as Sidebar.jsx — the single source of nav truth there
   is mirrored here deliberately (Sidebar is chrome-level, BottomNav is its
   mobile twin). Keep both lists in sync when adding a destination. */
const CHANNELS = [
  { key: "nav.all", icon: NAV_ICONS.all, path: "/", match: (p) => p === "/" || p === "/all" },
  { key: "nav.flow", icon: NAV_ICONS.flow, path: "/flow", match: (p) => p === "/flow", label: FLOW_NAME },
  { key: "nav.posts", icon: NAV_ICONS.posts, path: "/posts", match: (p) => p === "/posts" },
  { key: "nav.articles", icon: NAV_ICONS.articles, path: "/articles", match: (p) => p === "/articles" },
  { key: "nav.novels", icon: NAV_ICONS.novels, path: "/novels", match: (p) => p === "/novels" },
  { key: "nav.books", icon: NAV_ICONS.books, path: "/books", match: (p) => p.startsWith("/books") },
  { key: "nav.exams", icon: NAV_ICONS.exams, path: "/exams", match: (p) => p === "/exams" },
  { key: "nav.focus", icon: NAV_ICONS.focus, path: "/focus", match: (p) => p === "/focus" },
];

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label={t("aria.main")}>
      <ul className="bottom-nav__list">
        {CHANNELS.map((channel) => {
          const isActive = channel.match(location.pathname);
          const Icon = channel.icon;
          const label = channel.label || t(channel.key);
          return (
            <li key={channel.key} className="bottom-nav__item">
              <Link
                to={channel.path}
                className={`bottom-nav__link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="bottom-nav__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span className="bottom-nav__label">{label}</span>
              </Link>
            </li>
          );
        })}
        {/* Settings — same trailing position as the desktop sidebar */}
        <li className="bottom-nav__item">
          <Link
            to="/settings"
            className={`bottom-nav__link ${location.pathname === "/settings" ? "active" : ""}`}
            aria-current={location.pathname === "/settings" ? "page" : undefined}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              <NAV_ICONS.settings size={22} strokeWidth={1.75} />
            </span>
            <span className="bottom-nav__label">{t("nav.settings")}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default React.memo(BottomNav);
