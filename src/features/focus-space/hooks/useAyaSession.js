/**
 * useAyaSession — Aya's session brain, wired to the REAL shared timer engine.
 *
 * Aya knows:
 *  - whether a session has started, its goal, its config
 *  - phase (focus / break), paused state, remaining time (from the engine)
 *  - completed sessions count
 *
 * Key rules:
 *  - Timer expiry ≠ goal achieved. On expiry Aya ASKS the user whether the
 *    goal was achieved — she never declares success by herself.
 *  - No auto-starting new sessions.
 *  - Encouragement messages follow real time milestones of the CURRENT phase,
 *    are varied (never the same sentence twice in a row) and rate-limited
 *    (min 45s between any two messages).
 *  - Paused → time-linked encouragement pauses.
 *  - State persists in sessionStorage so leaving Focus Space and coming back
 *    restores the session (the engine itself persists in localStorage).
 *  - All messages are local rule-based strings (no AI/API calls).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATE_KEY = "ayaSessionState";
const MIN_MSG_GAP = 45 * 1000;

/* ---------- local message banks (Egyptian dialect, per spec) ---------- */
const BANK = {
  welcome: [
    "أهلًا بعودتك! 💙 مساحتك جاهزة، وهدفك مستنيك. إيه رأيك نبدأ خطوة صغيرة النهارده؟ أنا معاك.",
    "نورت المساحة 💙 الخطوة الصغيرة النهارده ممكن تكون أكبر إنجاز. نبدأ؟",
    "طمنيني على هدفك 😊 جاهز ناخد خطوة سوا؟ أنا معاك خطوة بخطوة.",
    "المساحة هادية ومستنياك 💙 اختار حاجة صغيرة وتعالى نبدأ.",
    "رجعت تاني؟ جميل! 🌿 هدفك لسه في مكانه — يلا نبدأ بحاجة صغيرة.",
  ],
  sessionStart: [
    "يلا نبدأ! ✨ أول خطوة اتعملت لما قررت تبدأ — ودي أهم بداية.",
    "تمام! الجلسة بدأت ✨ ركز في خطوة واحدة بس، وأنا بذاكر معاك.",
    "يلا بينا! 🚀 استهدف خطوة واضحة النهارده، وأنا معاك.",
  ],
  encouragement: [
    "أنت بتتقدم حتى لو مش حاسس. ركز في الخطوة اللي قدامك.",
    "برافو عليك، مستمر وتستاهل كل دقيقة 💙",
    "خطوة ورا خطوة — انت ماشي صح، كمّل.",
    "ركّز في النص اللي قدامك، اللي فات دي خطوات اتعملت فعلاً.",
    "الوقت بيعد لصالحك طالما انت موجود. استمر 🌟",
  ],
  idleNudge: [
    "لسه معايا؟ خد نفس عميق ونرجع نكمل خطوتنا.",
    "لو اتشتتت مفيش مشكلة 🌿 خد نفس وفكر في هدفك، نقدر نرجع نكمل بهدوء.",
    "رجّع تركيزك بالراحة مش بالتوتر — هدفك لسه مستنيك 💙",
  ],
  returned: [
    "رجعت! ممتاز، خلينا نكمل من مكان ما وقفنا.",
    "رجعت تاني 🎉 تمام، استأنف بنفس النقطة وأنا معاك.",
    "حلو إنك رجعت! خطوة واحدة صغيرة دلوقتي وتنطلق.",
  ],
  nearEnd: [
    "فاضل شوية ونحقق هدف الجلسة. متستعجلش، ركز.",
    "النهاية قريبة — آخر دقايق دي هي الأهم. ركز 💪",
  ],
  goalDone: [
    "أحسنت! أنت خلصت اللي وعدت نفسك بيه. فخورين بالخطوة دي! 🎉",
    "إنجاز حقيقي اليوم 🎉 خلينا ناخد نفس ونتصرف بفخر.",
  ],
  breakStart: [
    "خد استراحة حقيقية دلوقتي 🌿 ابععد عينك عن الشاشة شوية.",
    "استراحة تستحقها ☕ اتمدد واشرب حاجة، وأنا مستنيك ترجع.",
  ],
  readLater: [
    "عندك محتوى محفوظ في قائمة اقرأها لاحقًا 📚 تحب تخليه هدف الجلسة دي؟",
    "فاكر قائمة اقرأها لاحقًا؟ 📚 ممكن تختار منها هدف جلسة النهارده.",
  ],
};

const pick = (arr, lastRef) => {
  const filtered = arr.length > 1 && lastRef.current === arr[0] ? arr.slice(1) : arr;
  const msg = filtered[Math.floor(Math.random() * filtered.length)];
  lastRef.current = msg;
  return msg;
};

const loadState = () => {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const useAyaSession = ({ engine, onExpire } = {}) => {
  const persisted = useRef(loadState()).current;

  const [session, setSession] = useState(() => persisted || null);
  const [message, setMessage] = useState(null); // { text, kind, at }
  const [goalQuestion, setGoalQuestion] = useState(false); // timer expired → ask
  const lastMsgAtRef = useRef(0);
  const lastKindRef = useRef(null);
  const milestoneRef = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const say = useCallback((kind, force = false) => {
    const now = Date.now();
    if (!force && now - lastMsgAtRef.current < MIN_MSG_GAP) return false;
    if (lastKindRef.current === kind && !force && now - lastMsgAtRef.current < MIN_MSG_GAP * 2) return false;
    lastMsgAtRef.current = now;
    lastKindRef.current = kind;
    const msg = pick(BANK[kind] || BANK.encouragement, lastKindRef);
    setMessage({ text: msg, kind, at: now });
    return true;
  }, []);

  const dismissMessage = useCallback(() => setMessage(null), []);

  /** External nudges (idle / returned / read-later reminder) — forced, bypasses
   *  the rate limit gap because these are one-shot events per state transition.
   *  An optional { custom } text overrides the bank for one-shot context messages. */
  const nudge = useCallback((kind, opts = {}) => {
    const now = Date.now();
    const text = opts.custom || pick(BANK[kind] || BANK.encouragement, lastKindRef);
    lastMsgAtRef.current = now;
    lastKindRef.current = kind;
    setMessage({ text, kind, at: now });
  }, []);

  /** Saves state (sessionStorage only — transient per browser tab). */
  const persist = useCallback((s) => {
    try {
      if (s) sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(STATE_KEY);
    } catch { /* ignore */ }
  }, []);

  /* ---------- session lifecycle ---------- */

  const startSession = useCallback((config) => {
    // config: { goal, goalDesc, minutes, type: 'pomodoro'|'custom', breakMinutes, sessionsTarget, intervention }
    const s = {
      goal: (config.goal || "").trim(),
      goalDesc: (config.goalDesc || "").trim(),
      minutes: Math.max(1, Math.min(180, Number(config.minutes) || 25)),
      type: config.type === "pomodoro" ? "pomodoro" : "custom",
      breakMinutes: Math.max(1, Math.min(60, Number(config.breakMinutes) || 5)),
      sessionsTarget: Math.max(1, Math.min(12, Number(config.sessionsTarget) || 1)),
      intervention: ["gentle", "balanced", "active"].includes(config.intervention) ? config.intervention : "balanced",
      completed: 0,
      startedAt: Date.now(),
      done: false,
    };
    setSession(s);
    persist(s);
    say("sessionStart", true);
  }, [say, persist]);

  const completeGoal = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, done: true, completed: prev.completed + 1 };
      persist(next);
      return next;
    });
    say("goalDone", true);
  }, [say, persist]);

  const endSession = useCallback(() => {
    setSession(null);
    persist(null);
    setGoalQuestion(false);
    setMessage(null);
  }, [persist]);

  const extendSession = useCallback((extraMinutes = 5) => {
    setGoalQuestion(false);
    const mins = Math.max(1, Math.min(60, Number(extraMinutes) || 5));
    engine?.startCountdown?.("timer", mins * 60 * 1000, { aya: true });
    say("sessionStart", true);
  }, [engine, say]);

  const takeBreak = useCallback(() => {
    setGoalQuestion(false);
    const mins = sessionRef.current?.breakMinutes || 5;
    engine?.startCountdown?.("timer", mins * 60 * 1000, { ayaBreak: true });
    say("breakStart", true);
  }, [engine, say]);

  /* ---------- goal question when a phase expires ---------- */
  useEffect(() => {
    if (!onExpire || !sessionRef.current || sessionRef.current.done) return;
    // Timer expiry is NOT goal achievement — ask the user.
    setGoalQuestion(true);
    setMessage({
      text: `خلص الوقت المحدد لهدفك "${sessionRef.current.goal || "الجلسة"}". حققت هدفك؟ ولا محتاج وقت زيادة؟`,
      kind: "askGoal",
      at: Date.now(),
    });
  }, [onExpire]);

  /* ---------- time-linked encouragement (paused-safe) ---------- */
  const remainingMs = engine?.remainingMs ?? 0;
  const running = Boolean(engine?.running);
  const phase = engine?.state?.meta?.phase || engine?.state?.mode || null;
  const paused = Boolean(engine?.state && !engine?.running);

  useEffect(() => {
    const s = sessionRef.current;
    if (!s || s.done || !engine?.state || !running) return;
    const total = engine.state.durationMs || 1;
    const progress = 1 - remainingMs / total;

    // milestone: half-way + near-end (80%)
    const mKey = progress >= 0.8 ? "near" : progress >= 0.5 ? "half" : null;
    if (mKey && milestoneRef.current !== mKey && phase === "focus") {
      milestoneRef.current = mKey;
      say(mKey === "near" ? "nearEnd" : "encouragement",
        s.intervention === "active");
    }
    // active mode: periodic gentle nudges every ~5 min of real running time
    if (s.intervention === "active" && progress > 0 && Math.abs(progress % 0.25) < 0.004) {
      say("encouragement");
    }
  }, [remainingMs, running, engine?.state, phase, say]);

  const isRunning = Boolean(engine?.state) && running;

  return useMemo(() => ({
    session,
    message,
    goalQuestion,
    isRunning,
    paused,
    phase,
    remainingMs,
    startSession,
    completeGoal,
    endSession,
    extendSession,
    takeBreak,
    dismissMessage,
    nudge,
    setGoalQuestion,
  }), [session, message, goalQuestion, isRunning, paused, phase, remainingMs,
    startSession, completeGoal, endSession, extendSession, takeBreak, dismissMessage, nudge]);
};

export default useAyaSession;
