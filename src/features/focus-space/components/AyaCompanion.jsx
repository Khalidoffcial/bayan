/**
 * AyaCompanion — Aya's in-session presence next to the focus interface.
 *
 * - Uses the real Aya character asset from the project (src/assets/icons/736212.png).
 * - Visual states: welcome · idle · encouraging · focus · break · success
 *   (disambiguated via aria-live + a data-state attribute and color accents).
 * - Speech bubble with a Close button; Aya can be minimized / hidden temporarily.
 * - Quiet animations; fully disabled when reduceMotion is on.
 * - RTL/LTR aware via logical properties; never covers the clock or the rail.
 */
import React from "react";
import AyaAvatar from "../../../assets/icons/736212.png";
import "./ayaCompanion.css";

const fmt = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const stateOf = (session, paused, idle, hasMessage, phaseBreak) => {
  if (session?.done) return "success";
  if (idle) return "encouraging";
  if (!session) return "idle";
  if (paused) return "idle";
  if (phaseBreak) return "break";
  if (hasMessage) return "encouraging";
  return "focus";
};

const AyaFace = ({ state }) => (
  <div className={`aya-companion__face aya-companion__face--${state}`}>
    <img src={AyaAvatar} alt="" aria-hidden draggable="false" />
    <span className="aya-companion__pulse" aria-hidden />
  </div>
);

export const AyaCompanion = ({
  session, message, goalQuestion, paused, idle, remainingMs, engineState,
  onDismissMessage, onAnswerGoal, onExtend, onBreak, minimize, onToggleMinimize,
}) => {
  const phaseBreak = engineState?.meta?.ayaBreak === true;
  const state = stateOf(session, paused, idle, Boolean(message), phaseBreak);

  return (
    <div className={`aya-companion ${minimize ? "is-min" : ""}`} data-state={state} aria-live="polite">
      <button
        className="aya-companion__toggle"
        onClick={onToggleMinimize}
        aria-label={minimize ? "إظهار آية" : "تصغير آية"}
      >
        <AyaFace state={state} />
      </button>

      {message && !minimize && (
        <div className="aya-companion__bubble" role="status">
          <button className="aya-companion__bubble-close" onClick={onDismissMessage} aria-label="إغلاق الرسالة">✕</button>
          <p>{message.text}</p>
          {goalQuestion && (
            <div className="aya-companion__bubble-actions">
              <button className="aya-btn aya-btn--primary" onClick={() => onAnswerGoal("done")}>حققته ✓</button>
              <button className="aya-btn" onClick={onExtend}>وقت زيادة +5</button>
              <button className="aya-btn" onClick={onBreak}>استراحة</button>
            </div>
          )}
          {session && !goalQuestion && (
            <div className="aya-companion__meta">
              <span className="aya-companion__goal" title={session.goal}>🎯 {session.goal}</span>
              {remainingMs > 0 && <span className="aya-companion__time">{fmt(remainingMs)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AyaCompanion;
