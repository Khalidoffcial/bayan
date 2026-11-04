/**
 * FocusSmartTool — "أداة ذكية" (smart tool): an in-space study assistant
 * that runs 100% locally against the user's OWN focus document.
 *
 * It computes real, useful answers from the notes, tasks, sessions and
 * saved content — nothing is sent to any external service, and there is
 * no hallucinated content: when it has nothing to suggest, it says so.
 *
 * Slots:
 *  - Study tips: computed from session history (real tips, phrased per tip).
 *  - Task planner: chains the next task due within 24h into a plan.
 *  - Note finder: semantic-ish scoring over the user's notes (token overlap).
 *  - Session summarizer: real totals from the session log.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import "../styles/focus-space.css";

const sumSessions = (sessions, type) =>
  sessions
    .filter((s) => s.type === type && s.endedAt)
    .reduce((acc, s) => acc + (Number(s.actualMinutes) || Number(s.plannedMinutes) || 0), 0);

const buildTips = (sessions) => {
  const tips = [];
  const focus = sumSessions(sessions, "focus");
  const breaks = sumSessions(sessions, "break");
  if (sessions.length === 0) {
    tips.push("tip.firstSession");
  } else {
    if (focus >= 120) tips.push("tip.longFocus");
    if (breaks === 0 && focus > 25) tips.push("tip.noBreaks");
    if (focus > 0 && breaks / Math.max(focus, 1) > 0.4) tips.push("tip.manyBreaks");
    if (sessions.length >= 10 && tips.length === 0) tips.push("tip.healthy");
  }
  return tips;
};

const buildPlan = (tasks) => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const dueSoon = tasks
    .filter((tk) => tk.status !== "completed" && tk.dueDate)
    .map((tk) => ({ ...tk, ms: new Date(tk.dueDate).getTime() }))
    .filter((tk) => Number.isFinite(tk.ms) && tk.ms - now < dayMs)
    .sort((a, b) => a.ms - b.ms);
  return dueSoon.slice(0, 3);
};

const scoreNotes = (notes, query) => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!tokens.length) return [];
  return notes
    .map((n) => {
      const text = `${n.title} ${n.content}`.toLowerCase();
      const score = tokens.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      return { ...n, score };
    })
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

export const FocusSmartTool = ({ notes, tasks, sessions, savedItems }) => {
  const { t } = useTranslation();
  const [slot, setSlot] = useState("tips");
  const [query, setQuery] = useState("");

  const tips = useMemo(() => buildTips(sessions), [sessions]);
  const plan = useMemo(() => buildPlan(tasks), [tasks]);
  const found = useMemo(() => scoreNotes(notes, query), [notes, query]);
  const totals = useMemo(() => ({
    focus: sumSessions(sessions, "focus"),
    break: sumSessions(sessions, "break"),
    sessions: sessions.length,
    completed: sessions.filter((s) => s.completed).length,
  }), [sessions]);

  const slots = [
    { key: "tips", label: t("focus.smart.tips") },
    { key: "plan", label: t("focus.smart.plan") },
    { key: "find", label: t("focus.smart.find") },
    { key: "summary", label: t("focus.smart.summary") },
  ];

  return (
    <div className="fc-smart">
      <div className="fc-panel__tabs">
        {slots.map(({ key, label }) => (
          <button key={key} className={`fc-tab ${slot === key ? "active" : ""}`} onClick={() => setSlot(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="fc-smart__body">
        {slot === "tips" && (
          <>
            {tips.length === 0 && <div className="fc-empty">{t("focus.smart.nothing")}</div>}
            {tips.map((tip) => <p key={tip} className="fc-smart__tip">{t(`focus.smart.${tip}`)}</p>)}
          </>
        )}

        {slot === "plan" && (
          <>
            {plan.length === 0 && <div className="fc-empty">{t("focus.smart.planEmpty")}</div>}
            {plan.map((tk) => (
              <div key={tk.id} className="fc-smart__plan-item">
                <span className={`fc-chip fc-chip--${tk.priority}`}>{t(`focus.priority.${tk.priority}`)}</span>
                <strong>{tk.title}</strong>
                <span>{new Date(tk.dueDate).toLocaleString()}</span>
              </div>
            ))}
          </>
        )}

        {slot === "find" && (
          <>
            <input
              className="fc-input"
              placeholder={t("focus.smart.findPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {!query.trim() && <div className="fc-empty">{t("focus.smart.findHint")}</div>}
            {query.trim() && found.length === 0 && <div className="fc-empty">{t("focus.smart.findNothing")}</div>}
            {found.map((n) => (
              <div key={n.id} className="fc-smart__note-item">
                <strong>{n.title || t("focus.notes.untitled")}</strong>
                {n.content && <p>{n.content.slice(0, 120)}{n.content.length > 120 ? "…" : ""}</p>}
              </div>
            ))}
          </>
        )}

        {slot === "summary" && (
          <div className="fc-smart__summary">
            <div className="fc-summary-row"><span>{t("focus.summary.focusMin")}</span><strong>{totals.focus} {t("focus.minutes")}</strong></div>
            <div className="fc-summary-row"><span>{t("focus.summary.breakMin")}</span><strong>{totals.break} {t("focus.minutes")}</strong></div>
            <div className="fc-summary-row"><span>{t("focus.summary.sessions")}</span><strong>{totals.sessions}</strong></div>
            <div className="fc-summary-row"><span>{t("focus.summary.completed")}</span><strong>{totals.completed}</strong></div>
            <div className="fc-summary-row"><span>{t("focus.summary.saved")}</span><strong>{savedItems?.length || 0}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FocusSmartTool);
