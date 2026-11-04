/**
 * FocusNotifications — in-space notification center.
 * Sources: task reminders, session ends, saved-content nudges, aya moments.
 * Marking all read is local-first; the document mirrors it on next save.
 */
import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { BellIcon, ClockIcon, FlagIcon, BookmarkIcon, AyaIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const ICONS = {
  task_reminder: ClockIcon,
  session_end: FlagIcon,
  saved_content: BookmarkIcon,
  aya: AyaIcon,
};

export const FocusNotifications = ({ notifications, onChange }) => {
  const { t } = useTranslation();
  const list = [...notifications].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const unread = list.filter((n) => !n.read).length;

  const markAll = () => onChange(notifications.map((n) => ({ ...n, read: true })));
  const clear = () => onChange([]);

  return (
    <div className="fc-notifications">
      <div className="fc-notifications__bar">
        {unread > 0 && <span className="fc-badge">{t("focus.notifications.unread", { n: unread })}</span>}
        <button className="fc-btn" onClick={markAll} disabled={unread === 0}>{t("focus.notifications.markAll")}</button>
        <button className="fc-btn" onClick={clear} disabled={list.length === 0}>{t("focus.notifications.clear")}</button>
      </div>
      <div className="fc-notifications__list">
        {list.length === 0 && <div className="fc-empty">{t("focus.notifications.empty")}</div>}
        {list.map((n) => (
          <div key={n.id} className={`fc-notification ${n.read ? "is-read" : ""}`}>
            <span className="fc-notification__icon" aria-hidden>
              {(() => {
                const Glyph = ICONS[n.type] || BellIcon;
                return <Glyph size={15} />;
              })()}
            </span>
            <div className="fc-notification__body">
              <strong>{n.title}</strong>
              {n.body && <p>{n.body}</p>}
              <span className="fc-notification__time">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusNotifications;
