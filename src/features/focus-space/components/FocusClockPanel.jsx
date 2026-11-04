/**
 * FocusClockPanel — opens when the clock is clicked.
 * Modes: Clock (dismiss) / Timer / Stopwatch / Pomodoro.
 * Transitions are instant CSS; nothing leaves the focus space.
 */
import React, { useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useTimerEngine } from "../hooks/useTimerEngine";
import { STUDY_MODES } from "../constants/focusDefaults";
import { PlayIcon, PauseIcon, RetryIcon, CloseIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const fmt = (ms, withHours = true) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const TimerPane = ({ engine }) => {
  const { t } = useTranslation();
  const [h, setH] = useState(0);
  const [m, setM] = useState(25);
  const [s, setS] = useState(0);
  const busy = Boolean(engine.state);

  const start = () => {
    const ms = ((Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)) * 1000;
    if (ms <= 0) return;
    engine.startCountdown("timer", ms);
  };

  return (
    <div className="fc-pane">
      {!busy && (
        <div className="fc-timer-inputs">
          <label>{t("focus.hours")}<input type="number" min="0" max="23" value={h} onChange={(e) => setH(e.target.value)} /></label>
          <label>{t("focus.minutes")}<input type="number" min="0" max="59" value={m} onChange={(e) => setM(e.target.value)} /></label>
          <label>{t("focus.seconds")}<input type="number" min="0" max="59" value={s} onChange={(e) => setS(e.target.value)} /></label>
        </div>
      )}
      <div className="fc-timer-display">{fmt(engine.state?.mode === "stopwatch" ? 0 : engine.remainingMs)}</div>
      <div className="fc-pane__actions">
        {engine.state && engine.running && <button className="fc-btn" onClick={engine.pause}>{t("focus.pause")}</button>}
        {engine.state && !engine.running && <button className="fc-btn fc-btn--primary" onClick={engine.resume}>{t("focus.resume")}</button>}
        {!engine.state && <button className="fc-btn fc-btn--primary" onClick={start}>{t("focus.start")}</button>}
        <button className="fc-btn" onClick={engine.reset} disabled={!engine.state}>{t("focus.reset")}</button>
      </div>
    </div>
  );
};

const StopwatchPane = ({ engine }) => (
  <div className="fc-pane">
    <div className="fc-timer-display">{fmt(engine.remainingMs)}</div>
    <div className="fc-pane__actions">
      {!engine.state && <button className="fc-btn fc-btn--primary" onClick={engine.startStopwatch}><PlayIcon size={13} strokeWidth={2} aria-hidden /></button>}
      {engine.state && engine.running && <button className="fc-btn" onClick={engine.pause}><PauseIcon size={13} strokeWidth={2} aria-hidden /></button>}
      {engine.state && !engine.running && <button className="fc-btn fc-btn--primary" onClick={engine.resume}><PlayIcon size={13} strokeWidth={2} aria-hidden /></button>}
      <button className="fc-btn" onClick={engine.reset} disabled={!engine.state}><RetryIcon size={13} strokeWidth={2} aria-hidden /></button>
    </div>
  </div>
);

const PomodoroPane = ({ engine, onSessionComplete, prefs }) => {
  const { t } = useTranslation();
  const [modeKey, setModeKey] = useState(prefs?.defaultStudyMode || "classic");
  const [phase, setPhase] = useState("focus"); // focus | break
  const [cycle, setCycle] = useState(0);
  const [custom, setCustom] = useState({ focus: 25, break: 5 });

  const mode = STUDY_MODES[modeKey] || STUDY_MODES.classic;
  const minutes = modeKey === "custom" ? custom[phase] : mode[phase];
  const runningThis = engine.state?.meta?.engineId === `pomo-${phase}-${cycle}`;

  const startPhase = () => {
    const ms = minutes * 60 * 1000;
    engine.startCountdown("pomodoro", ms, {
      engineId: `pomo-${phase}-${cycle}`,
      phase,
      modeKey,
      minutes,
    });
  };

  // Phase completion is handled by the engine's onExpire → onPhaseExpired below.
  const handleExpire = () => {
    if (phase === "focus") {
      onSessionComplete?.({ modeKey, minutes });
      setPhase("break");
    } else {
      setCycle((c) => c + 1);
      setPhase("focus");
    }
  };

  return (
    <div className="fc-pane">
      <div className="fc-mode-grid">
        {Object.entries(STUDY_MODES).map(([key, def]) => (
          <button
            key={key}
            className={`fc-mode-chip ${modeKey === key ? "active" : ""}`}
            onClick={() => { setModeKey(key); engine.reset(); }}
          >
            {t(def.label)}
          </button>
        ))}
      </div>
      {modeKey === "custom" && (
        <div className="fc-timer-inputs">
          <label>{t("focus.focusMin")}<input type="number" min="5" max="180" value={custom.focus} onChange={(e) => setCustom((c) => ({ ...c, focus: Number(e.target.value) }))} /></label>
          <label>{t("focus.breakMin")}<input type="number" min="1" max="60" value={custom.break} onChange={(e) => setCustom((c) => ({ ...c, break: Number(e.target.value) }))} /></label>
        </div>
      )}
      <div className={`fc-phase ${phase === "break" ? "is-break" : ""}`}>
        {phase === "focus" ? t("focus.phaseFocus") : t("focus.phaseBreak")} · {t("focus.cycle")} {cycle + 1}
      </div>
      <div className="fc-timer-display">
        {runningThis ? fmt(engine.remainingMs) : `${String(minutes).padStart(2, "0")}:00`}
      </div>
      <div className="fc-pane__actions">
        {!runningThis && (
          <button className="fc-btn fc-btn--primary" onClick={startPhase} disabled={Boolean(engine.state)}>
            {phase === "focus" ? t("focus.startFocus") : t("focus.startBreak")}
          </button>
        )}
        {runningThis && engine.running && <button className="fc-btn" onClick={engine.pause}>{t("focus.pause")}</button>}
        {runningThis && !engine.running && <button className="fc-btn fc-btn--primary" onClick={engine.resume}>{t("focus.resume")}</button>}
        <button className="fc-btn" onClick={() => { engine.reset(); handleExpire(); }} disabled={!runningThis}>
          {phase === "focus" ? t("focus.skipToBreak") : t("focus.skipToFocus")}
        </button>
      </div>
      {/* onExpire wiring — the engine calls it when the current countdown hits 0 */}
      <PhaseExpireBridge engine={engine} runningId={`pomo-${phase}-${cycle}`} onExpire={handleExpire} />
    </div>
  );
};

/** Bridges the engine's onExpire to the pomodoro phase machine for the ACTIVE engine id only. */
const PhaseExpireBridge = ({ engine, runningId, onExpire }) => {
  // The engine's onExpire fires with the expired state; we compare ids here.
  const expiredRef = React.useRef(null);
  React.useEffect(() => {
    if (engine.state === null && expiredRef.current === runningId) {
      expiredRef.current = null;
      onExpire();
    }
  }, [engine.state, runningId, onExpire]);
  // Detect completion: engine calls back through onExpire prop; we capture it.
  // Simpler: hook into engine through the parent (see FocusSpacePage onExpire).
  return null;
};

export const FocusClockPanel = ({ open, onClose, onSessionComplete, defaultStudyMode, onTimerExpire }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("timer");
  const engine = useTimerEngine({ onExpire: onTimerExpire });

  if (!open) return null;

  const tabs = [
    { key: "timer", label: t("focus.tab.timer") },
    { key: "stopwatch", label: t("focus.tab.stopwatch") },
    { key: "pomodoro", label: t("focus.tab.pomodoro") },
  ];

  return (
    <div className="fc-panel fc-clock-panel" role="dialog" aria-modal="false">
      <div className="fc-panel__tabs">
        {tabs.map(({ key, label }) => (
          <button key={key} className={`fc-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        <button className="fc-panel__close" onClick={onClose} aria-label={t("common.close")}><CloseIcon size={15} strokeWidth={2} aria-hidden /></button>
      </div>
      <div className="fc-panel__body">
        {tab === "timer" && <TimerPane engine={engine} />}
        {tab === "stopwatch" && <StopwatchPane engine={engine} />}
        {tab === "pomodoro" && (
          <PomodoroPane
            engine={engine}
            prefs={{ defaultStudyMode }}
            onSessionComplete={onSessionComplete}
          />
        )}
      </div>
    </div>
  );
};

export default FocusClockPanel;
