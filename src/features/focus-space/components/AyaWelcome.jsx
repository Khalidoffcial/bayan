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
import { useTranslation } from "../../../i18n/useTranslation";
import { getTranslation } from "../../../i18n/translations";
import { useSettings } from "../../../contexts/SettingsContext";

export const AyaWelcome = ({ onStart, onContinue, onLater, returning }) => {
  const { language } = useTranslation();
  const welcomeKeys = ["aya.welcome.return1", "aya.welcome.return2", "aya.welcome.return3", "aya.welcome.new1", "aya.welcome.new2"];
  const text = useMemo(() => {
    const i = Number(sessionStorage.getItem("ayaWelcomeIdx") || 0) % welcomeKeys.length;
    sessionStorage.setItem("ayaWelcomeIdx", String((i + 1) % welcomeKeys.length));
    return getTranslation(language, welcomeKeys[i]);
  }, [language]);
  const { t } = useTranslation();
  return (
    <div className="aya-welcome" role="dialog" aria-label={t("aya.name")}>
      <button className="aya-welcome__close" onClick={onLater} aria-label={t("common.close")}>✕</button>
      <div className="aya-welcome__head">
        <img src={AyaAvatar} alt="" aria-hidden />
        <div>
          <strong>{t("aya.name")}</strong>
          <small>{t(returning ? "aya.subtitle.returning" : "aya.subtitle.new")}</small>
        </div>
      </div>
      <p className="aya-welcome__body">{text}</p>
      <div className="aya-welcome__actions">
        <button className="aya-btn aya-btn--primary" onClick={onStart}>{t("aya.start")}</button>
        {returning && <button className="aya-btn" onClick={onContinue}>{t("aya.continue")}</button>}
        <button className="aya-btn aya-btn--ghost" onClick={onLater}>{t("aya.notNow")}</button>
      </div>
    </div>
  );
};

const AYA_SUGGESTED_GOAL_KEYS = [
  "aya.goal.study25",
  "aya.goal.readPage",
  "aya.goal.organizeTasks",
  "aya.goal.writeParagraph",
  "aya.goal.reviewSummary",
];

const DURATIONS = [15, 25, 45, 50, 90];

export const AyaSessionSetup = ({ defaultMinutes, onStart, onClose }) => {
  const { t } = useTranslation();
  const [goal, setGoal] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [minutes, setMinutes] = useState(defaultMinutes || 25);
  const [type, setType] = useState("custom"); // custom | pomodoro
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionsTarget, setSessionsTarget] = useState(1);
  const [intervention, setIntervention] = useState("balanced");

  const start = () => {
    // If the user hasn't picked a goal, help them choose a small clear one.
    const finalGoal = goal.trim() || t("aya.goal.suggested");
    onStart({ goal: finalGoal, goalDesc, minutes, type, breakMinutes, sessionsTarget, intervention });
  };

  return (
    <div className="aya-setup" role="dialog" aria-modal="true" aria-label={t("aya.setup.title")}>
      <h3>
        <img src={AyaAvatar} alt="" aria-hidden />
        {t("aya.setup.title")} ✨
      </h3>
      <p className="aya-setup__hint">{t("aya.setup.hint")}</p>

      <div className="aya-setup__field">
        <label>{t("aya.setup.goalName")}</label>
        <input
          className="aya-setup__input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("aya.setup.goalPlaceholder")}
          autoFocus
        />
        <div className="aya-setup__suggestions">
          <span style={{ fontSize: 12, opacity: .6, alignSelf: "center" }}>{t("aya.setup.tryHint")}</span>
          {AYA_SUGGESTED_GOAL_KEYS.map((g) => (
            <button key={g} type="button" className="aya-setup__suggestion" onClick={() => setGoal(t(g))}>{t(g)}</button>
          ))}
        </div>
      </div>

      <div className="aya-setup__field">
        <label>{t("aya.setup.descLabel")}</label>
        <textarea value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} placeholder={t("aya.setup.descPlaceholder")} />
      </div>

      <div className="aya-setup__row">
        <div className="aya-setup__field">
          <label>{t("aya.setup.typeLabel")}</label>
          <div className="aya-setup__chips">
            <button type="button" className={`aya-setup__chip ${type === "custom" ? "active" : ""}`} onClick={() => setType("custom")}>{t("aya.setup.typeCustom")}</button>
            <button type="button" className={`aya-setup__chip ${type === "pomodoro" ? "active" : ""}`} onClick={() => setType("pomodoro")}>{t("aya.setup.typePomodoro")}</button>
          </div>
        </div>
        <div className="aya-setup__field">
          <label>{t("aya.setup.sessionsLabel")}</label>
          <input className="aya-setup__input" type="number" min="1" max="12" value={sessionsTarget}
            onChange={(e) => setSessionsTarget(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </div>
      </div>

      <div className="aya-setup__row">
        <div className="aya-setup__field">
          <label>{t("aya.setup.focusDuration")}</label>
          <input className="aya-setup__input" type="number" min="5" max="180" value={minutes}
            onChange={(e) => setMinutes(Math.max(5, Math.min(180, Number(e.target.value) || 25)))} />
          <div className="aya-setup__chips">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className={`aya-setup__chip ${minutes === d ? "active" : ""}`} onClick={() => setMinutes(d)}>{d}{t("aya.setup.minUnit")}</button>
            ))}
          </div>
        </div>
        <div className="aya-setup__field">
          <label>{t("aya.setup.breakDuration")}</label>
          <input className="aya-setup__input" type="number" min="1" max="60" value={breakMinutes}
            onChange={(e) => setBreakMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 5)))} />
        </div>
      </div>

      <div className="aya-setup__field">
        <label>{t("aya.setup.interventionLabel")}</label>
        <div className="aya-setup__chips">
          <button type="button" className={`aya-setup__chip ${intervention === "gentle" ? "active" : ""}`} onClick={() => setIntervention("gentle")}>{t("aya.setup.intervention.gentle")}</button>
          <button type="button" className={`aya-setup__chip ${intervention === "balanced" ? "active" : ""}`} onClick={() => setIntervention("balanced")}>{t("aya.setup.intervention.balanced")}</button>
          <button type="button" className={`aya-setup__chip ${intervention === "active" ? "active" : ""}`} onClick={() => setIntervention("active")}>{t("aya.setup.intervention.active")}</button>
        </div>
      </div>

      <div className="aya-setup__actions">
        <button type="button" className="aya-btn aya-btn--ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button type="button" className="aya-btn aya-btn--primary" onClick={start}>{t("aya.setup.startSession")} 🚀</button>
      </div>
    </div>
  );
};
