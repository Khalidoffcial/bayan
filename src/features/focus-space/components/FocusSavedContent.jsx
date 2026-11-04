/**
 * FocusSavedContent — "Saved for Later".
 *
 * Reads the user's REAL bookmarked items (articles / novels / posts) from
 * the backend — no demo entries. "Continue Reading" navigates to the real
 * reader routes; "Mark as Read" is local-first (the saved list refresh
 * re-syncs on next reload of the panel).
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../../i18n/useTranslation";
import "../styles/focus-space.css";

const TYPE_KEYS = { article: "articles", novel: "novels", post: "posts" };

export const FocusSavedContent = ({ items, loading, error, unreadCount, onMarkRead }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = items
    .filter((i) => filter === "all" || i.type === filter)
    .filter((i) =>
      !query.trim() ||
      `${i.title} ${i.description || ""}`.toLowerCase().includes(query.trim().toLowerCase())
    );

  return (
    <div className="fc-saved">
      <div className="fc-saved__bar">
        {unreadCount > 0 && (
          <span className="fc-badge">{t("focus.saved.unread", { n: unreadCount })}</span>
        )}
        <input
          className="fc-input"
          placeholder={t("focus.saved.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="fc-saved__filters">
          {["all", "article", "novel", "post"].map((f) => (
            <button
              key={f}
              className={`fc-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {t(`focus.saved.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="fc-saved__list">
        {loading && <div className="fc-empty">{t("feed.loading")}</div>}
        {!loading && error && <div className="fc-empty">{t("feed.error")}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="fc-empty">{t("focus.saved.empty")}</div>
        )}
        {filtered.map((item) => (
          <div key={`${item.type}-${item.id}`} className={`fc-saved-item ${item.read ? "is-read" : ""}`}>
            {item.image && <img className="fc-saved-item__thumb" src={item.image} alt="" loading="lazy" />}
            <div className="fc-saved-item__body">
              <div className="fc-saved-item__type">{t(`focus.saved.filter.${item.type}`)}</div>
              <strong>{item.title || t("focus.saved.untitled")}</strong>
              {item.description && <p>{item.description}</p>}
              {item.savedAt && (
                <span className="fc-saved-item__date">
                  {new Date(item.savedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="fc-saved-item__actions">
              <button
                className="fc-btn fc-btn--primary"
                onClick={() => navigate(item.link || "/")}
              >
                {t("focus.saved.continue")}
              </button>
              {!item.read && (
                <button className="fc-btn" onClick={() => onMarkRead(item)}>
                  {t("focus.saved.markRead")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusSavedContent;
