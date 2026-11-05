/**
 * useAyaActivity — lightweight activity awareness for Aya.
 *
 * Rules (per spec):
 * - Mouse movement ALONE is never treated as engagement or productivity.
 * - Keyboard + mouse + scroll + touch are sampled to know only ONE thing:
 *   "is the user present in the page right now?"
 * - An idle timer (default 90s) flags idleness; the first interaction back
 *   after idleness emits a single "returned" event.
 * - NO keystroke content, NO mouse coordinates, NOTHING leaves this module —
 *   nothing personal is ever stored or sent anywhere.
 * - Listeners are passive and throttled to ~1 sample / second.
 */
import { useEffect, useRef, useState } from "react";

const IDLE_MS = 90 * 1000;
const SAMPLE_MS = 1000;

export const useAyaActivity = ({ onIdleStart, onReturn } = {}) => {
  const [idle, setIdle] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const idleRef = useRef(false);
  const cbsRef = useRef({});
  cbsRef.current = { onIdleStart, onReturn };

  useEffect(() => {
    let sampleTimer = null;
    let dirty = false;

    const mark = () => { dirty = true; };
    const sample = () => {
      sampleTimer = null;
      if (!dirty) return;
      dirty = false;
      const wasIdle = idleRef.current;
      lastActiveRef.current = Date.now();
      if (wasIdle) {
        idleRef.current = false;
        setIdle(false);
        cbsRef.current.onReturn?.();
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "click", "focus"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const check = () => {
      const idleNow = Date.now() - lastActiveRef.current > IDLE_MS;
      if (idleNow && !idleRef.current) {
        idleRef.current = true;
        setIdle(true);
        cbsRef.current.onIdleStart?.();
      }
      if (!idleNow && !sampleTimer) sampleTimer = setTimeout(sample, SAMPLE_MS);
    };

    const id = setInterval(check, 5000);
    check();
    return () => {
      clearInterval(id);
      if (sampleTimer) clearTimeout(sampleTimer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);

  return { idle };
};

export default useAyaActivity;
