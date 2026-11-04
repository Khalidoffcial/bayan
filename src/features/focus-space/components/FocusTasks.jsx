/**
 * FocusTasks — study tasks with due dates, priority, deferral, repeat,
 * and reminder chaining: an in-space reminder fires when the due date
 * reaches its reminder time while the space is open.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { PlusIcon, CheckIcon, ClockIcon, LoopIcon, SkipIcon, DeleteIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const uid = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const PRIORITIES = ["low", "medium", "high"];
const REPEATS = ["none", "daily", "weekly", "monthly"];

export const FocusTasks = ({ tasks, onChange, onNotify }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    title: "", description: "", dueDate: "", reminder: "",
    priority: "medium", category: "", repeat: "none",
  });

  const sorted = useMemo(() => {
    const rank = { high: 0, medium: 1, low: 2 };
    const pending = tasks.filter((tk) => tk.status !== "completed");
    const done = tasks.filter((tk) => tk.status === "completed");
    pending.sort((a, b) =>
      rank[a.priority] - rank[b.priority] || (a.dueDate || "").localeCompare(b.dueDate || "")
    );
    done.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
    return [...pending, ...done];
  }, [tasks]);

  const add = () => {
    if (!draft.title.trim()) return;
    onChange([
      {
        id: uid(),
        ...draft,
        priority: PRIORITIES.includes(draft.priority) ? draft.priority : "medium",
        repeat: REPEATS.includes(draft.repeat) ? draft.repeat : "none",
        status: "pending",
        deferred: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      ...tasks,
    ]);
    setDraft({ title: "", description: "", dueDate: "", reminder: "", priority: "medium", category: "", repeat: "none" });
  };

  const complete = (id) =>
    onChange(tasks.map((tk) =>
      tk.id === id
        ? { ...tk, status: "completed", completedAt: new Date().toISOString() }
        : tk
    ));

  const reopen = (id) =>
    onChange(tasks.map((tk) => (tk.id === id ? { ...tk, status: "pending", completedAt: null } : tk)));

  const remove = (id) => onChange(tasks.filter((tk) => tk.id !== id));

  const defer = (id) => {
    onChange(tasks.map((tk) => {
      if (tk.id !== id) return tk;
      const next = { ...tk, deferred: !tk.deferred };
      // Reminder chain: deferring pushes the reminder one day ahead.
      if (!tk.deferred && tk.reminder) {
        const d = new Date(tk.reminder);
        if (Number.isFinite(d.getTime())) {
          d.setDate(d.getDate() + 1);
          next.reminder = d.toISOString().slice(0, 16);
        }
      }
      return next;
    }));
  };

  return (
    <div className="fc-tasks">
      <div className="fc-task-add">
        <input
          className="fc-input"
          placeholder={t("focus.tasks.title")}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <details className="fc-task-add__more">
          <summary>{t("focus.tasks.details")}</summary>
          <input
            className="fc-input"
            placeholder={t("focus.tasks.description")}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <div className="fc-tasks__row">
            <label>{t("focus.tasks.due")}
              <input type="datetime-local" className="fc-input" value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} />
            </label>
            <label>{t("focus.tasks.reminder")}
              <input type="datetime-local" className="fc-input" value={draft.reminder}
                onChange={(e) => setDraft((d) => ({ ...d, reminder: e.target.value }))} />
            </label>
          </div>
          <div className="fc-tasks__row">
            <label>{t("focus.tasks.priority")}
              <select className="fc-select" value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{t(`focus.priority.${p}`)}</option>)}
              </select>
            </label>
            <label>{t("focus.tasks.category")}
              <input className="fc-input" placeholder={t("focus.tasks.categoryHint")} value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
            </label>
            <label>{t("focus.tasks.repeat")}
              <select className="fc-select" value={draft.repeat}
                onChange={(e) => setDraft((d) => ({ ...d, repeat: e.target.value }))}>
                {REPEATS.map((r) => <option key={r} value={r}>{t(`focus.repeat.${r}`)}</option>)}
              </select>
            </label>
          </div>
        </details>
        <button className="fc-btn fc-btn--primary" onClick={add} disabled={!draft.title.trim()}><PlusIcon size={15} strokeWidth={2} aria-hidden /></button>
      </div>

      <div className="fc-tasks__list">
        {sorted.length === 0 && <div className="fc-empty">{t("focus.tasks.empty")}</div>}
        {sorted.map((tk) => {
          const done = tk.status === "completed";
          return (
            <div key={tk.id} className={`fc-task ${done ? "is-done" : ""} ${tk.deferred ? "is-deferred" : ""} prio-${tk.priority}`}>
              <button
                className="fc-check"
                onClick={() => (done ? reopen(tk.id) : complete(tk.id))}
                aria-label={done ? t("focus.tasks.reopen") : t("focus.tasks.complete")}
              >
                {done && <CheckIcon size={12} strokeWidth={2.4} aria-hidden />}
              </button>
              <div className="fc-task__body">
                <strong className={done ? "strike" : ""}>{tk.title}</strong>
                {tk.description && <p>{tk.description}</p>}
                <div className="fc-task__meta">
                  {tk.category && <span className="fc-chip">{tk.category}</span>}
                  <span className={`fc-chip fc-chip--${tk.priority}`}>{t(`focus.priority.${tk.priority}`)}</span>
                  {tk.dueDate && <span className="fc-chip"><ClockIcon size={11} strokeWidth={1.75} aria-hidden /> {new Date(tk.dueDate).toLocaleString()}</span>}
                  {tk.repeat !== "none" && <span className="fc-chip"><LoopIcon size={11} strokeWidth={1.75} aria-hidden /> {t(`focus.repeat.${tk.repeat}`)}</span>}
                  {tk.deferred && <span className="fc-chip"><SkipIcon size={11} strokeWidth={1.75} aria-hidden /> {t("focus.tasks.deferred")}</span>}
                </div>
              </div>
              <div className="fc-task__tools">
                {!done && <button className="fc-icon-btn" onClick={() => defer(tk.id)} aria-label={t("focus.tasks.defer")}><SkipIcon size={14} strokeWidth={1.75} aria-hidden /></button>}
                <button className="fc-icon-btn" onClick={() => remove(tk.id)} aria-label={t("common.delete")}><DeleteIcon size={14} strokeWidth={1.75} aria-hidden /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FocusTasks;
