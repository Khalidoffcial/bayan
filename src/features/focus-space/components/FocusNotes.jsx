/**
 * FocusNotes — quick notes panel. Creates / edits / deletes / pins /
 * searches / links to a task. Arabic + English friendly (plain text).
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { PlusIcon, PinIcon, EditIcon, DeleteIcon, LinkIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const uid = () => `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const FocusNotes = ({ notes, onChange, tasks }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "", taskId: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? notes.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(q))
      : notes;
    // pinned first, then newest
    return [...list].sort((a, b) =>
      b.pinned === a.pinned ? (b.updatedAt || "").localeCompare(a.updatedAt || "") : b.pinned - a.pinned
    );
  }, [notes, query]);

  const startNew = () => {
    setEditingId("new");
    setDraft({ title: "", content: "", taskId: "" });
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setDraft({ title: n.title, content: n.content, taskId: n.taskId || "" });
  };

  const commit = () => {
    if (editingId === "new") {
      onChange([
        { id: uid(), ...draft, taskId: draft.taskId || null, pinned: false, updatedAt: new Date().toISOString() },
        ...notes,
      ]);
    } else {
      onChange(notes.map((n) =>
        n.id === editingId ? { ...n, ...draft, taskId: draft.taskId || null, updatedAt: new Date().toISOString() } : n
      ));
    }
    setEditingId(null);
    setDraft({ title: "", content: "", taskId: "" });
  };

  const remove = (id) => onChange(notes.filter((n) => n.id !== id));
  const togglePin = (id) =>
    onChange(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n)));

  return (
    <div className="fc-notes">
      <div className="fc-notes__bar">
        <input
          className="fc-input"
          placeholder={t("focus.notes.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="fc-btn fc-btn--primary" onClick={startNew}><PlusIcon size={15} strokeWidth={2} aria-hidden /></button>
      </div>

      {editingId && (
        <div className="fc-note-editor">
          <input
            className="fc-input"
            placeholder={t("focus.notes.title")}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <textarea
            className="fc-input fc-note-editor__content"
            placeholder={t("focus.notes.content")}
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            rows={4}
          />
          <select
            className="fc-select"
            value={draft.taskId}
            onChange={(e) => setDraft((d) => ({ ...d, taskId: e.target.value }))}
          >
            <option value="">{t("focus.notes.linkTask")}</option>
            {tasks.map((tk) => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
          </select>
          <div className="fc-pane__actions">
            <button className="fc-btn fc-btn--primary" onClick={commit} disabled={!draft.title.trim() && !draft.content.trim()}>
              {t("common.save")}
            </button>
            <button className="fc-btn" onClick={() => setEditingId(null)}>{t("common.cancel")}</button>
          </div>
        </div>
      )}

      <div className="fc-notes__list">
        {filtered.length === 0 && !editingId && (
          <div className="fc-empty">{t("focus.notes.empty")}</div>
        )}
        {filtered.map((n) => (
          <div key={n.id} className={`fc-note ${n.pinned ? "is-pinned" : ""}`}>
            <div className="fc-note__head">
              <strong>{n.title || t("focus.notes.untitled")}</strong>
              <div className="fc-note__tools">
                <button className="fc-icon-btn" onClick={() => togglePin(n.id)} aria-label={t("focus.notes.pin")} aria-pressed={Boolean(n.pinned)}>
                  <PinIcon size={14} strokeWidth={1.75} aria-hidden />
                </button>
                <button className="fc-icon-btn" onClick={() => startEdit(n)} aria-label={t("common.edit")}><EditIcon size={14} strokeWidth={1.75} aria-hidden /></button>
                <button className="fc-icon-btn" onClick={() => remove(n.id)} aria-label={t("common.delete")}><DeleteIcon size={14} strokeWidth={1.75} aria-hidden /></button>
              </div>
            </div>
            {n.content && <p className="fc-note__body">{n.content}</p>}
            {n.taskId && (
              <div className="fc-note__link">
                <LinkIcon size={11} strokeWidth={1.75} aria-hidden /> {tasks.find((tk) => tk.id === n.taskId)?.title || t("focus.notes.linkedTaskGone")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusNotes;
