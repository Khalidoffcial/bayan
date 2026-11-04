/**
 * FocusClockPanel — full timer suite opened from the clock itself.
 *
 * Tabs: Timer (countdown editor) · Pomodoro (full cycle machine) · Stopwatch (laps)
 * Premium dark-glass styling consistent with the space; quiet animation.
 *
 * Time accuracy: the engine (useTimerEngine) is timestamp-based — display only.
 * State survives navigation + reload via localStorage; expiry while away is
 * surfaced as a banner on return (engine settles, panel shows "expired").
 * Alert sounds play ONLY on user-configured expiry, after a user gesture
 * started the timer (browser autoplay-safe) — never automatically.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useTimerEngine } from "../hooks/useTimerEngine";
import { STUDY_MODES, TIMER_PRESETS, FOCUS_DEFAULTS } from "../constants/focusDefaults";
import { PlayIcon, PauseIcon, RetryIcon, CloseIcon, FlagIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const fmt = (ms, withHours = true, withCentis = false) => {
  const total = Math.max(0, Math.floor(ms / (withCentis ? 10 : 1000)));
  const h = Math.floor(total / 360000);
  const m = Math.floor((total % 360000) / 6000);
  const s = Math.floor((total % 6000) / 100);
  const cs = total % 100;
  const pad = (n) => String(n).padStart(2, "0");
  const base = withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return withCentis ? `${base}.${pad(cs)}` : base;
};

// ── alert sound (WebAudio — no asset files needed, off/soft/chime/bell) ──
const playAlert = (kind, volume = 0.7) => {
  if (!kind || kind === "none") return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const vol = Math.max(0, Math.min(1, volume));
    const tone = (freq, at, dur, type = "sine") => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + at);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + dur + 0.05);
    };
    if (kind === "chime") { tone(880, 0, 0.5); tone(1320, 0.35, 0.7); tone(1760, 0.7, 1.0); }
    else if (kind === "bell") { for (let i = 0; i < 3; i++) { tone(660, i * 0.8, 1.2, "triangle"); tone(990, i * 0.8 + 0.05, 1.0, "sine"); } }
    else if (kind === "soft") { tone(520, 0, 0.8, "sine"); tone(390, 0.4, 1.1, "sine"); }
    setTimeout(() => ctx.close?.(), 4000);
  } catch { /* audio unsupported — silent expiry is fine */ }
};

/** Countdown editor: h/m/s steppers + quick presets. */
const TimerPane = ({ engine, prefs }) => {
  const { t } = useTranslation();
  const [h, setH] = useState(0);
  const [m, setM] = useState(25);
  const [s, setS] = useState(0);
  const busy = Boolean(engine.state);
  const editing = !busy && engine.state === null;
  const expireNotifiedRef = useRef(false);

  const totalMs = ((Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)) * 1000;

  const start = () => {
    if (totalMs <= 0) return;
    expireNotifiedRef.current = false;
    engine.startCountdown("timer", totalMs);
  };

  // fire the alert ONCE when the countdown hits zero (user already gestured)
  useEffect(() => {
    if (engine.state?.mode === "timer" && !engine.running && engine.remainingMs === 0 && !expireNotifiedRef.current) {
      expireNotifiedRef.current = true;
      playAlert(prefs.timerSound || "chime", prefs.timerSoundVolume ?? 0.7);
    }
  }, [engine.state, engine.running, engine.remainingMs, prefs.timerSound, prefs.timerSoundVolume]);

  const stepper = (label, value, set, max, unit) => (
    <div className="fc-tstep">
      <button className="fc-tstep__btn" onClick={() => set((v) => Math.min(max, (Number(v) || 0) + 1))} aria-label={`+ ${label}`}>+</button>
      <input
        className="fc-tstep__val" type="number" min="0" max={max} value={value}
        onChange={(e) => set(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        aria-label={label}
        disabled={busy}
      />
      <button className="fc-tstep__btn" onClick={() => set((v) => Math.max(0, (Number(v) || 0) - 1))} aria-label={`− ${label}`}>−</button>
      <span className="fc-tstep__lbl">{unit}</span>
    </div>
  );

  return (
    <div className="fc-pane">
      {editing && (
        <>
          <div className="fc-timer-inputs">
            {stepper(t("focus.hours"), h, setH, 23, t("focus.hours"))}
            {stepper(t("focus.minutes"), m, setM, 59, t("focus.minutes"))}
            {stepper(t("focus.seconds"), s, setS, 59, t("focus.seconds"))}
          </div>
          <div className="fc-presets">
            {TIMER_PRESETS.map((p) => (
              <button key={p} className={`fc-chip ${m === p && !h && !s ? "active" : ""}`} onClick={() => { setH(0); setM(p); setS(0); }}>
                {p} {t("focus.minutes")}
              </button>
            ))}
          </div>
        </>
      )}
      <div className={`fc-timer-display ${engine.running ? "is-running" : ""}`}>
        {fmt(engine.state?.mode === "stopwatch" ? 0 : engine.remainingMs)}
      </div>
      {engine.state?.mode === "timer" && !engine.running && engine.remainingMs === 0 && (
        <div className="fc-expired">{t("focus.timer.expired")}</div>
      )}
      <div className="fc-pane__actions">
        {engine.state && engine.running && <button className="fc-btn" onClick={engine.pause}>{t("focus.pause")}</button>}
        {engine.state && !engine.running && engine.remainingMs > 0 && <button className="fc-btn fc-btn--primary" onClick={engine.resume}>{t("focus.resume")}</button>}
        {!engine.state && <button className="fc-btn fc-btn--primary" onClick={start} disabled={totalMs <= 0}>{t("focus.start")}</button>}
        <button className="fc-btn" onClick={() => { expireNotifiedRef.current = false; engine.reset(); setH(0); setM(25); setS(0); }} disabled={!engine.state}>{t("focus.reset")}</button>
      </div>
    </div>
  );
};

/** Stopwatch with laps (best/worst marked). */
const StopwatchPane = ({ engine }) => {
  const { t } = useTranslation();
  const [laps, setLaps] = useState(() => {
    try { return JSON.parse(localStorage.getItem("focusStopwatchLaps") || "[]"); } catch { return []; }
  });

  const addLap = () => {
    if (!engine.state) return;
    const total = engine.remainingMs;
    const delta = total - (laps[0]?.totalMs || 0);
    const next = [{ totalMs: total, deltaMs: Math.max(0, delta), at: new Date().toISOString() }, ...laps].slice(0, 50);
    setLaps(next);
    try { localStorage.setItem("focusStopwatchLaps", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const clearLaps = () => {
    setLaps([]);
    try { localStorage.removeItem("focusStopwatchLaps"); } catch { /* ignore */ }
  };

  const best = useMemo(() => (laps.length >= 2 ? Math.min(...laps.slice(0, -1).map((l) => l.deltaMs)) : null), [laps]);

  return (
    <div className="fc-pane">
      <div className={`fc-timer-display ${engine.running ? "is-running" : ""}`}>
        {fmt(engine.remainingMs || 0, true, true)}
      </div>
      <div className="fc-pane__actions">
        {!engine.state && <button className="fc-btn fc-btn--primary" onClick={engine.startStopwatch}><PlayIcon size={13} strokeWidth={2} aria-hidden /> {t("focus.start")}</button>}
        {engine.state && engine.running && <button className="fc-btn" onClick={engine.pause}><PauseIcon size={13} strokeWidth={2} aria-hidden /> {t("focus.pause")}</button>}
        {engine.state && !engine.running && <button className="fc-btn fc-btn--primary" onClick={engine.resume}><PlayIcon size={13} strokeWidth={2} aria-hidden /> {t("focus.resume")}</button>}
        <button className="fc-btn" onClick={addLap} disabled={!engine.state || !engine.running}><FlagIcon size={13} strokeWidth={2} aria-hidden /> {t("focus.lap")}</button>
        <button className="fc-btn" onClick={() => { engine.reset(); clearLaps(); }} disabled={!engine.state && laps.length === 0}><RetryIcon size={13} strokeWidth={2} aria-hidden /></button>
      </div>
      {laps.length > 0 && (
        <ul className="fc-laps">
          {laps.map((l, i) => (
            <li key={i} className={l.deltaMs === best ? "is-best" : ""}>
              <span className="fc-laps__n">#{laps.length - i}</span>
              <span className="fc-laps__d">{fmt(l.deltaMs, false, true)}</span>
              <span className="fc-laps__t">{fmt(l.totalMs, true, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Full Pomodoro machine: configurable short/long break, cycle count, skip, stats. */
const PomodoroPane = ({ engine, onSessionComplete, prefs, data }) => {
  const { t } = useTranslation();
  const [modeKey, setModeKey] = useState(prefs?.defaultStudyMode || "classic");
  const [phase, setPhase] = useState("focus"); // focus | short | long
  const [cycle, setCycle] = useState(0);
  const [custom, setCustom] = useState({ focus: 25, short: 5, long: 15 });
  const [completed, setCompleted] = useState(() => Number(sessionStorage.getItem("focusPomoCompleted") || 0));
  const [stats, setStats] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("focusPomoStats") || '{"focus":0,"short":0,"long":0}'); } catch { return { focus: 0, short: 0, long: 0 }; }
  });
  const beforeLong = data.pomodoroSessionsBeforeLong || FOCUS_DEFAULTS.pomodoroSessionsBeforeLong;

  const mode = STUDY_MODES[modeKey] || STUDY_MODES.classic;
  const customMode = modeKey === "custom";
  const minutes = customMode
    ? custom[phase === "focus" ? "focus" : phase === "long" ? "long" : "short"]
    : phase === "focus" ? mode.focus : phase === "long" ? (data.pomodoroLongBreak || FOCUS_DEFAULTS.pomodoroLongBreak) : (data.pomodoroShortBreak || FOCUS_DEFAULTS.pomodoroShortBreak);
  const runningThis = engine.state?.meta?.engineId === `pomo-${phase}-${cycle}`;

  const bumpStat = (key) => {
    setStats((prev) => {
      const next = { ...prev, [key]: (prev[key] || 0) + 1 };
      try { sessionStorage.setItem("focusPomoStats", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    if (key === "focus") {
      setCompleted((c) => { const n = c + 1; try { sessionStorage.setItem("focusPomoCompleted", String(n)); } catch { /* ignore */ } return n; });
    }
  };

  const startPhase = () => {
    const ms = minutes * 60 * 1000;
    engine.startCountdown("pomodoro", ms, { engineId: `pomo-${phase}-${cycle}`, phase, modeKey, minutes });
  };

  // advance the cycle machine when a phase expires (or is skipped)
  const advance = useCallback((expired = false) => {
    if (expired) {
      playAlert(phase === "focus" ? (data.timerSound || "chime") : "soft", data.timerSoundVolume ?? 0.6);
      if (phase === "focus") { onSessionComplete?.({ modeKey, minutes }); bumpStat("focus"); }
      else bumpStat(phase === "long" ? "long" : "short");
    }
    if (phase === "focus") {
      const nextIsLong = (cycle + 1) % beforeLong === 0;
      setPhase(nextIsLong ? "long" : "short");
    } else {
      setCycle((c) => c + 1);
      setPhase("focus");
    }
    engine.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cycle, beforeLong, engine, onSessionComplete, modeKey, minutes, data.timerSound]);

  // expiry bridge — only for the ACTIVE engine id
  const expiredRef = useRef(null);
  useEffect(() => {
    if (engine.state === null && expiredRef.current === `pomo-${phase}-${cycle}`) {
      expiredRef.current = null;
      advance(true);
    }
  }, [engine.state, phase, cycle, advance]);

  const phaseLabel = phase === "focus" ? t("focus.phaseFocus") : phase === "long" ? t("focus.phaseLongBreak") : t("focus.phaseBreak");

  return (
    <div className="fc-pane">
      <div className="fc-mode-grid">
        {Object.entries(STUDY_MODES).map(([key, def]) => (
          <button key={key} className={`fc-mode-chip ${modeKey === key ? "active" : ""}`} onClick={() => { setModeKey(key); engine.reset(); }}>
            {t(def.label)}
          </button>
        ))}
      </div>

      {customMode && !runningThis && (
        <div className="fc-timer-inputs fc-pomo-custom">
          <label>{t("focus.focusMin")}<input type="number" min="5" max="180" value={custom.focus} onChange={(e) => setCustom((c) => ({ ...c, focus: Number(e.target.value) }))} /></label>
          <label>{t("focus.breakMin")}<input type="number" min="1" max="60" value={custom.short} onChange={(e) => setCustom((c) => ({ ...c, short: Number(e.target.value) }))} /></label>
          <label>{t("focus.longBreakMin")}<input type="number" min="5" max="90" value={custom.long} onChange={(e) => setCustom((c) => ({ ...c, long: Number(e.target.value) }))} /></label>
        </div>
      )}

      <div className="fc-pomo-status">
        <div className={`fc-phase ${phase !== "focus" ? "is-break" : ""}`}>{phaseLabel} · {t("focus.cycle")} {cycle + 1}</div>
        <div className="fc-dots" aria-label={t("focus.cycleProgress")}>
          {Array.from({ length: beforeLong }).map((_, i) => (
            <i key={i} className={i < (cycle % beforeLong) || (cycle > 0 && cycle % beforeLong === 0 && phase !== "focus") ? "done" : ""} />
          ))}
        </div>
      </div>

      <div className={`fc-timer-display ${runningThis && engine.running ? "is-running" : ""}`}>
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
        <button className="fc-btn" onClick={() => advance(false)} disabled={!runningThis && engine.state === null && cycle === 0}>
          {phase === "focus" ? t("focus.skipToBreak") : t("focus.skipToFocus")}
        </button>
        <button className="fc-btn" onClick={() => { engine.reset(); setCycle(0); setPhase("focus"); }} disabled={!engine.state}>{t("focus.reset")}</button>
      </div>

      <div className="fc-pomo-stats">
        <span>{t("focus.stats.completedToday")}: <strong>{completed}</strong></span>
        <span>{t("focus.stats.breaks")}: <strong>{(stats.short || 0) + (stats.long || 0)}</strong></span>
        <span>{t("focus.stats.cycles")}: <strong>{cycle}</strong></span>
      </div>
    </div>
  );
};

export const FocusClockPanel = ({ open, onClose, onSessionComplete, defaultStudyMode, onTimerExpire, data }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("timer");
  const engine = useTimerEngine({ onExpire: onTimerExpire });

  if (!open) return null;

  const tabs = [
    { key: "timer", label: t("focus.tab.timer") },
    { key: "pomodoro", label: t("focus.tab.pomodoro") },
    { key: "stopwatch", label: t("focus.tab.stopwatch") },
  ];
  const prefs = { timerSound: data?.timerSound || "chime", timerSoundVolume: data?.timerSoundVolume ?? 0.7 };

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
        {tab === "timer" && <TimerPane engine={engine} prefs={prefs} />}
        {tab === "stopwatch" && <StopwatchPane engine={engine} />}
        {tab === "pomodoro" && (
          <PomodoroPane
            engine={engine}
            prefs={{ defaultStudyMode }}
            data={data}
            onSessionComplete={onSessionComplete}
          />
        )}
      </div>
    </div>
  );
};

export default FocusClockPanel;
