/**
 * FocusSavedContent — "Read Later" list inside Focus Space.
 *
 * Shows the user's REAL saved items (articles / novels / posts) — no demo
 * data. Each item: cover, title, type, saved date, read status + progress,
 * Continue/Start reading (opens the in-space reader over the original
 * content), mark-completed and remove actions.
 * Search, type filter, sort (newest/oldest), empty/loading/error + retry.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useToast } from "../../../components/ui/Toast";
import { toggleReadLater, updateReadProgress } from "../services/savedContent.service";
import "./focusSavedList.css";

const STATUS_LABEL = {
  not_started: "focus.saved.status.notStarted",
  in_progress: "focus.saved.status.inProgress",
  completed: "focus.saved.status.completed",
};

export const FocusSavedContent = ({
  items, loading, error, onRetry, onOpenItem, onListChanged,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    const list = items
      .filter((i) => filter === "all" || i.contentType === filter)
      .filter((i) =>
        !query.trim() ||
        `${i.title || ""} ${i.description || ""}`.toLowerCase().includes(query.trim().toLowerCase())
      );
    list.sort((a, b) => {
      const ta = new Date(a.savedAt || 0).getTime();
      const tb = new Date(b.savedAt || 0).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [items, filter, query, sort]);

  const removeItem = async (item) => {
    if (busyId) return;
    setBusyId(`${item.contentType}-${item.contentId}`);
    const result = await toggleReadLater({ contentId: item.contentId, contentType: item.contentType });
    setBusyId(null);
    if (result.ok) {
      toast.success(t("readLater.removed"));
      onListChanged?.();
    } else toast.error(t("readLater.failed"));
  };

  const markCompleted = async (item) => {
    if (busyId) return;
    setBusyId(`${item.contentType}-${item.contentId}`);
    const result = await updateReadProgress({ contentId: item.contentId, contentType: item.contentType, readStatus: "completed", readProgressPercent: 100 });
    setBusyId(null);
    if (result.ok) {
      toast.success(t("readLater.markedCompleted"));
      onListChanged?.();
    } else toast.error(t("readLater.failed"));
  };

  const reopen = async (item) => {
    if (busyId) return;
    setBusyId(`${item.contentType}-${item.contentId}`);
    const result = await toggleReadLater({ contentId: item.contentId, contentType: item.contentType });
    setBusyId(null);
    if (result.ok) {
      toast.success(t("readLater.saved"));
      onListChanged?.();
    } else toast.error(t("readLater.failed"));
  };

  return (
    <div className="fc-saved">
      <div className="fc-saved__bar">
        <input
          className="fc-input"
          placeholder={t("focus.saved.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("focus.saved.search")}
        />
        <div className="fc-saved__filters">
          {["all", "article", "novel", "post", "book"].map((f) => (
            <button key={f} className={`fc-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {t(`focus.saved.filter.${f}`)}
            </button>
          ))}
        </div>
        <select className="fc-input fc-saved__sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("focus.saved.sort")}>
          <option value="newest">{t("focus.saved.sortNewest")}</option>
          <option value="oldest">{t("focus.saved.sortOldest")}</option>
        </select>
      </div>

      <div className="fc-saved__list">
        {loading && <div className="fc-empty">{t("feed.loading")}</div>}
        {!loading && error && (
          <div className="fc-empty">
            <p>{t("feed.error")}</p>
            <button className="fc-btn" onClick={onRetry}>{t("common.retry")}</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="fc-empty fc-empty--art">
            <span aria-hidden>🔖</span>
            <p>{t("focus.saved.empty")}</p>
          </div>
        )}
        {filtered.map((item) => {
          const pct = Number(item.readProgressPercent) || 0;
          const done = item.readStatus === "completed";
          return (
            <div key={`${item.contentType}-${item.contentId}`} className={`fc-saved-item ${done ? "is-read" : ""}`}>
              {item.image && <img className="fc-saved-item__thumb" src={item.image} alt="" loading="lazy" />}
              <div className="fc-saved-item__body">
                <div className="fc-saved-item__top">
                  <span className={`fc-saved-item__type fc-saved-item__type--${item.contentType}`}>
                    {t(`focus.saved.filter.${item.contentType}`)}
                  </span>
                  <span className={`fc-saved-item__status fc-saved-item__status--${item.readStatus || "not_started"}`}>
                    {t(STATUS_LABEL[item.readStatus] || STATUS_LABEL.not_started)}
                  </span>
                </div>
                <strong>{item.title || t("focus.saved.untitled")}</strong>
                {item.description && <p>{item.description}</p>}
                <div className="fc-saved-item__meta">
                  {item.savedAt && (
                    <span className="fc-saved-item__date">{new Date(item.savedAt).toLocaleDateString()}</span>
                  )}
                  {item.readStatus === "in_progress" && pct > 0 && (
                    <span className="fc-saved-item__progress">{t("focus.saved.progress", { n: pct })}</span>
                  )}
                </div>
                {item.readStatus === "in_progress" && pct > 0 && (
                  <div className="fc-saved-item__bar" aria-hidden><div style={{ width: `${pct}%` }} /></div>
                )}
              </div>
              <div className="fc-saved-item__actions">
                <button
                  className="fc-btn fc-btn--primary"
                  onClick={() => onOpenItem?.(item)}
                  disabled={Boolean(busyId)}
                >
                  {item.readStatus === "not_started" || pct === 0 ? t("focus.saved.start") : t("focus.saved.continue")}
                </button>
                {!done && item.readStatus !== "not_started" && (
                  <button className="fc-btn" onClick={() => markCompleted(item)} disabled={Boolean(busyId)}>
                    {t("readLater.markCompleted")}
                  </button>
                )}
                {done && (
                  <button className="fc-btn" onClick={() => reopen(item)} disabled={Boolean(busyId)}>
                    {t("readLater.reAdd")}
                  </button>
                )}
                <button
                  className="fc-btn fc-btn--danger"
                  onClick={() => removeItem(item)}
                  disabled={Boolean(busyId)}
                  aria-label={t("readLater.remove")}
                  title={t("readLater.remove")}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FocusSavedContent;
