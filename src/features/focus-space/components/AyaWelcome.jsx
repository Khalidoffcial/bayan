/**
 * AyaWelcome + AyaSessionSetup — the entry points of the Aya experience.
 *
 * Welcome (per session, not per route change — controlled by the parent via
 * sessionStorage) offers: Start with Aya · Continue where I left off · Not now.
 * The message text varies between visits (rotating bank, no annoying repeats).
 *
 * Session setup: goal name, optional description, focus duration, Pomodoro
 * vs Custom, break length, number of sessions, and Aya's intervention level.
 * If the user leaves the goal empty, Aya suggests small clear goals.
 */
import React, { useMemo, useState } from "react";
import AyaAvatar from "../../../assets/icons/736212.png";
import "./ayaCompanion.css";

const WELCOME_BANK = [
  "أهلًا بعودتك! 💙 مساحتك جاهزة، وهدفك مستنيك. إيه رأيك نبدأ خطوة صغيرة النهارده؟ أنا معاك.",
  "نورت Bayan Space 💙 الخطوة الصغيرة النهارده ممكن تكون أكبر إنجاز. نبدأ سوا؟",
  "طمنيني على هدفك 😊 جاهز ناخد خطوة سوا؟ أنا معاك خطوة بخطوة.",
  "المساحة هادية ومستنياك 🌿 اختار حاجة صغيرة وتعالى نبدأ.",
  "رجعت تاني؟ جميل! هدفك لسه في مكانه — يلا نبدأ بحاجة صغيرة 💙",
];
const pickWelcome = () => {
  const i = Number(sessionStorage.getItem("ayaWelcomeIdx") || 0) % WELCOME_BANK.length;
  sessionStorage.setItem("ayaWelcomeIdx", String((i + 1) % WELCOME_BANK.length));
  return WELCOME_BANK[i];
};

export const AyaWelcome = ({ onStart, onContinue, onLater, returning }) => {
  const text = useMemo(() => pickWelcome(), []);
  return (
    <div className="aya-welcome" role="dialog" aria-label="Aya">
      <button className="aya-welcome__close" onClick={onLater} aria-label="إغلاق">✕</button>
      <div className="aya-welcome__head">
        <img src={AyaAvatar} alt="" aria-hidden />
        <div>
          <strong>Aya</strong>
          <small>{returning ? "رفيقتك في التركيز" : "رفيقتك الجديدة في التركيز"}</small>
        </div>
      </div>
      <p className="aya-welcome__body">{text}</p>
      <div className="aya-welcome__actions">
        <button className="aya-btn aya-btn--primary" onClick={onStart}>Start with Aya</button>
        {returning && <button className="aya-btn" onClick={onContinue}>Continue where I left off</button>}
        <button className="aya-btn aya-btn--ghost" onClick={onLater}>Not now</button>
      </div>
    </div>
  );
};

const SUGGESTED_GOALS = [
  "أذاكر 25 دقيقة مركّز",
  "أكمل صفحة واحدة قراءة",
  "أرتب مهام اليوم",
  "أكتب فقرة واحدة",
  "أراجع ملخص محاضرة",
];

const DURATIONS = [15, 25, 45, 50, 90];

export const AyaSessionSetup = ({ defaultMinutes, onStart, onClose, t }) => {
  const [goal, setGoal] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [minutes, setMinutes] = useState(defaultMinutes || 25);
  const [type, setType] = useState("custom"); // custom | pomodoro
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionsTarget, setSessionsTarget] = useState(1);
  const [intervention, setIntervention] = useState("balanced");

  const start = () => {
    // If the user hasn't picked a goal, help them choose a small clear one.
    const finalGoal = goal.trim() || SUGGESTED_GOALS[0];
    onStart({ goal: finalGoal, goalDesc, minutes, type, breakMinutes, sessionsTarget, intervention });
  };

  return (
    <div className="aya-setup" role="dialog" aria-modal="true" aria-label="Start Aya Session">
      <h3>
        <img src={AyaAvatar} alt="" aria-hidden />
        Start Aya Session ✨
      </h3>
      <p className="aya-setup__hint">خلينا نحدد هدفنا ونشتغل عليه خطوة بخطوة.</p>

      <div className="aya-setup__field">
        <label>اسم الهدف</label>
        <input
          className="aya-setup__input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="إيه اللي عايز تحققه الجلسة دي؟"
          autoFocus
        />
        <div className="aya-setup__suggestions">
          <span style={{ fontSize: 12, opacity: .6, alignSelf: "center" }}>محتار؟ جرّب:</span>
          {SUGGESTED_GOALS.map((g) => (
            <button key={g} type="button" className="aya-setup__suggestion" onClick={() => setGoal(g)}>{g}</button>
          ))}
        </div>
      </div>

      <div className="aya-setup__field">
        <label>وصف مختصر (اختياري)</label>
        <textarea value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} placeholder="تفاصيل صغيرة توضح الهدف…" />
      </div>

      <div className="aya-setup__row">
        <div className="aya-setup__field">
          <label>نوع الجلسة</label>
          <div className="aya-setup__chips">
            <button type="button" className={`aya-setup__chip ${type === "custom" ? "active" : ""}`} onClick={() => setType("custom")}>Custom</button>
            <button type="button" className={`aya-setup__chip ${type === "pomodoro" ? "active" : ""}`} onClick={() => setType("pomodoro")}>Pomodoro</button>
          </div>
        </div>
        <div className="aya-setup__field">
          <label>عدد الجلسات</label>
          <input className="aya-setup__input" type="number" min="1" max="12" value={sessionsTarget}
            onChange={(e) => setSessionsTarget(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </div>
      </div>

      <div className="aya-setup__row">
        <div className="aya-setup__field">
          <label>مدة التركيز (دقيقة)</label>
          <input className="aya-setup__input" type="number" min="5" max="180" value={minutes}
            onChange={(e) => setMinutes(Math.max(5, Math.min(180, Number(e.target.value) || 25)))} />
          <div className="aya-setup__chips">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className={`aya-setup__chip ${minutes === d ? "active" : ""}`} onClick={() => setMinutes(d)}>{d}د</button>
            ))}
          </div>
        </div>
        <div className="aya-setup__field">
          <label>مدة الاستراحة (دقيقة)</label>
          <input className="aya-setup__input" type="number" min="1" max="60" value={breakMinutes}
            onChange={(e) => setBreakMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 5)))} />
        </div>
      </div>

      <div className="aya-setup__field">
        <label>مستوى تدخل Aya</label>
        <div className="aya-setup__chips">
          <button type="button" className={`aya-setup__chip ${intervention === "gentle" ? "active" : ""}`} onClick={() => setIntervention("gentle")}>Gentle</button>
          <button type="button" className={`aya-setup__chip ${intervention === "balanced" ? "active" : ""}`} onClick={() => setIntervention("balanced")}>Balanced</button>
          <button type="button" className={`aya-setup__chip ${intervention === "active" ? "active" : ""}`} onClick={() => setIntervention("active")}>Active</button>
        </div>
      </div>

      <div className="aya-setup__actions">
        <button type="button" className="aya-btn aya-btn--ghost" onClick={onClose}>إلغاء</button>
        <button type="button" className="aya-btn aya-btn--primary" onClick={start}>ابدأ الجلسة 🚀</button>
      </div>
    </div>
  );
};
