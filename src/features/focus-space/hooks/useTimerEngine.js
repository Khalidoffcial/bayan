/**
 * useTimerEngine — timestamp-based timer core for Timer / Pomodoro / Stopwatch.
 *
 * Design rules (per spec):
 * - NEVER derive remaining time from setInterval ticks alone. Every render
 *   computes `endAt - now` from an absolute epoch timestamp, so background
 *   throttling, page reloads and route changes stay accurate.
 * - Exactly ONE engine may run at a time — starting one mode stops the other.
 * - Running state is mirrored to localStorage so a reload resumes correctly.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const ENGINE_KEY = "focusTimerEngine";

const readPersisted = () => {
  try {
    const raw = localStorage.getItem(ENGINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persist = (state) => {
  try {
    if (state) localStorage.setItem(ENGINE_KEY, JSON.stringify(state));
    else localStorage.removeItem(ENGINE_KEY);
  } catch {
    /* ignore */
  }
};

const nowMs = () => Date.now();

export const useTimerEngine = ({ onExpire, onTick } = {}) => {
  const persistedRef = useRef(readPersisted());

  // { mode, endAt, durationMs, startedAt, pausedAt, accumulatedMs }
  const [state, setState] = useState(() => persistedRef.current);
  const [remainingMs, setRemainingMs] = useState(() => {
    const p = persistedRef.current;
    if (!p) return 0;
    if (p.mode === "stopwatch") return p.pausedAt ? p.accumulatedMs : nowMs() - p.startedAt + p.accumulatedMs;
    if (p.pausedAt) return Math.max(0, p.endAt - p.pausedAt);
    return Math.max(0, p.endAt - nowMs());
  });
  const [running, setRunning] = useState(() => {
    const p = persistedRef.current;
    return Boolean(p && !p.pausedAt);
  });

  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  // One rAF-free interval at 250ms — accurate enough for a focus clock,
  // cheap enough for a background tab. The VALUE always comes from the
  // timestamp, never from counting ticks.
  useEffect(() => {
    if (!running || !state) return;
    const id = setInterval(() => {
      const now = nowMs();
      if (state.mode === "stopwatch") {
        const elapsed = now - state.startedAt + state.accumulatedMs;
        setRemainingMs(elapsed);
        tickRef.current?.(elapsed);
        return;
      }
      const remaining = Math.max(0, state.endAt - now);
      setRemainingMs(remaining);
      tickRef.current?.(remaining);
      if (remaining === 0) {
        setRunning(false);
        persist(null);
        setState(null);
        expireRef.current?.(state);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, state]);

  /** Starts a countdown (timer / pomodoro phase). Stops any other engine. */
  const startCountdown = useCallback((mode, durationMs, meta = {}) => {
    const next = {
      mode,
      durationMs,
      endAt: nowMs() + durationMs,
      startedAt: nowMs(),
      pausedAt: null,
      accumulatedMs: 0,
      meta,
    };
    setState(next);
    setRunning(true);
    setRemainingMs(durationMs);
    persist(next);
  }, []);

  /** Starts the stopwatch. Stops any other engine. */
  const startStopwatch = useCallback(() => {
    const next = {
      mode: "stopwatch",
      durationMs: 0,
      endAt: 0,
      startedAt: nowMs(),
      pausedAt: null,
      accumulatedMs: 0,
      meta: {},
    };
    setState(next);
    setRunning(true);
    setRemainingMs(0);
    persist(next);
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.pausedAt) return prev;
      const next = { ...prev, pausedAt: nowMs() };
      persist(next);
      return next;
    });
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (!prev || !prev.pausedAt) return prev;
      const now = nowMs();
      const pausedFor = now - prev.pausedAt;
      const next =
        prev.mode === "stopwatch"
          ? { ...prev, startedAt: now, pausedAt: null, accumulatedMs: prev.accumulatedMs }
          : { ...prev, endAt: prev.endAt + pausedFor, pausedAt: null };
      persist(next);
      return next;
    });
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    setState(null);
    setRunning(false);
    setRemainingMs(0);
    persist(null);
  }, []);

  return {
    state,
    remainingMs,
    running,
    startCountdown,
    startStopwatch,
    pause,
    resume,
    reset,
  };
};

export default useTimerEngine;
