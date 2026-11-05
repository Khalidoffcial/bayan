/**
 * KnowledgeChallenges — quiz sessions powered by Open Trivia DB (via the
 * backend proxy: grading is server-side, the answer key never reaches the
 * client; results save to the user's profile for signed-in users only —
 * guests play with session-only results and are never told "saved").
 *
 * Design: Premium Minimal — Bayan colors, Lucide icons, calm motion,
 * RTL/LTR aware, no emoji, no gamified pressure.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import useAuth from "../../../hooks/useAuth";
import {
  fetchCategories, createSession, checkAnswer, saveResult, fetchHistory,
} from "../services/trivia.service";
import {
  PlayIcon, CheckIcon, CloseIcon, RetryIcon, HistoryIcon,
  ChevronRightIcon, ChevronLeftIcon, ClockIcon,
} from "../../focus-space/constants/focusIcons";
import "./exams.css";

const AMOUNTS = [5, 10, 15, 20];
const DIFFICULTIES = [
  { value: "", labelKey: "exams.difficulty.any" },
  { value: "easy", labelKey: "exams.difficulty.easy" },
  { value: "medium", labelKey: "exams.difficulty.medium" },
  { value: "hard", labelKey: "exams.difficulty.hard" },
];
const TYPES = [
  { value: "", labelKey: "exams.type.any" },
  { value: "multiple", labelKey: "exams.type.multiple" },
  { value: "boolean", labelKey: "exams.type.boolean" },
];

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ── Setup: pick amount / category / difficulty / type ── */
const Setup = ({ categories, onStart, starting, history, onOpenHistory }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(10);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [type, setType] = useState("");

  return (
    <div className="kc-setup">
      <div className="kc-setup__grid">
        <div className="kc-field">
          <span className="kc-field__label">{t("exams.setup.amount")}</span>
          <div className="kc-choices" role="radiogroup" aria-label={t("exams.setup.amount")}>
            {AMOUNTS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={amount === n}
                className={`kc-choice ${amount === n ? "is-active" : ""}`}
                onClick={() => setAmount(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div className="kc-field">
          <span className="kc-field__label">{t("exams.setup.category")}</span>
          <select className="kc-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("exams.category.any")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="kc-field">
          <span className="kc-field__label">{t("exams.setup.difficulty")}</span>
          <div className="kc-choices" role="radiogroup" aria-label={t("exams.setup.difficulty")}>
            {DIFFICULTIES.map((d) => (
              <button key={d.value} type="button" role="radio" aria-checked={difficulty === d.value}
                className={`kc-choice ${difficulty === d.value ? "is-active" : ""}`}
                onClick={() => setDifficulty(d.value)}>{t(d.labelKey)}</button>
            ))}
          </div>
        </div>

        <div className="kc-field">
          <span className="kc-field__label">{t("exams.setup.type")}</span>
          <div className="kc-choices" role="radiogroup" aria-label={t("exams.setup.type")}>
            {TYPES.map((ty) => (
              <button key={ty.value} type="button" role="radio" aria-checked={type === ty.value}
                className={`kc-choice ${type === ty.value ? "is-active" : ""}`}
                onClick={() => setType(ty.value)}>{t(ty.labelKey)}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="kc-btn kc-btn--primary" onClick={() => onStart({ amount, category, difficulty, type })} disabled={starting}>
        {starting ? <span className="mini-spinner" /> : <PlayIcon size={16} strokeWidth={2} aria-hidden />}
        {t("exams.start")}
      </button>

      {history.length > 0 && (
        <button className="kc-btn" onClick={onOpenHistory}>
          <HistoryIcon size={15} strokeWidth={1.75} aria-hidden /> {t("exams.history.title")}
        </button>
      )}
    </div>
  );
};

/* ── Play: one question at a time ── */
const Player = ({ sessionId, questions, onDone, config }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null); // chosen option of the CURRENT question
  const [verdict, setVerdict] = useState(null); // { isCorrect, correctAnswer }
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState([]); // {question, answer, isCorrect, correctAnswer}
  const startedAt = useRef(Date.now());

  const q = questions[index];
  const total = questions.length;

  const pick = async (option) => {
    if (verdict || checking) return; // منع الإجابة المكررة + منع الانتقال قبل الإجابة
    setPicked(option);
    setChecking(true);
    const r = await checkAnswer({ sessionId, question: q.question, answer: option });
    setChecking(false);
    if (!r.ok) {
      // grading failed — release the pick so the user can retry the same question
      setPicked(null);
      return;
    }
    setVerdict({ isCorrect: r.isCorrect, correctAnswer: r.correctAnswer });
    setAnswers((prev) => [...prev, { question: q.question, answer: option, isCorrect: r.isCorrect, correctAnswer: r.correctAnswer, options: q.options, type: q.type }]);
  };

  const next = () => {
    if (!verdict) return; // لا انتقال قبل اختيار الإجابة
    if (index + 1 >= total) {
      onDone({ answers, timeSpentSec: Math.round((Date.now() - startedAt.current) / 1000) });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setVerdict(null);
  };

  if (!q) return null;
  const NextIcon = document.documentElement.dir === "rtl" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <div className="kc-player">
      <div className="kc-player__meta">
        <span>{t("exams.questionOf", { n: index + 1, total })}</span>
        <span className="kc-player__tags">
          {q.category} · {t(`exams.difficulty.${q.difficulty}`)}
        </span>
      </div>

      <div className="kc-player__bar" aria-hidden><div style={{ width: `${((index) / total) * 100}%` }} /></div>

      <h3 className="kc-player__question" dir="auto">{q.question}</h3>

      <div className="kc-answers" role="radiogroup" aria-label={t("exams.answers")}>
        {q.options.map((opt) => {
          const isPicked = picked === opt;
          const isCorrect = verdict && opt === verdict.correctAnswer;
          const isWrongPick = verdict && isPicked && !verdict.isCorrect;
          return (
            <button
              key={opt}
              type="button"
              className={`kc-answer ${isPicked ? "is-picked" : ""} ${isCorrect ? "is-correct" : ""} ${isWrongPick ? "is-wrong" : ""}`}
              onClick={() => pick(opt)}
              disabled={Boolean(verdict) || checking}
              aria-checked={isPicked}
              role="radio"
            >
              <span className="kc-answer__mark" aria-hidden>
                {isCorrect ? <CheckIcon size={14} strokeWidth={2.4} /> : isWrongPick ? <CloseIcon size={14} strokeWidth={2.4} /> : null}
              </span>
              <span dir="auto">{opt}</span>
            </button>
          );
        })}
      </div>

      {verdict && (
        <div className={`kc-verdict ${verdict.isCorrect ? "is-correct" : "is-wrong"}`} role="status">
          {verdict.isCorrect ? t("exams.correct") : t("exams.incorrect")}
        </div>
      )}

      <button className="kc-btn kc-btn--primary" onClick={next} disabled={!verdict}>
        {index + 1 >= total ? t("exams.finish") : t("exams.next")}
        <NextIcon size={15} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
};

/* ── Result ── */
const Result = ({ config, answers, timeSpentSec, categories, onRetry, onNew, onReview }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // true/false/null — لا رسالة نجاح وهمية

  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const categoryName = config?.category
    ? categories.find((c) => String(c.id) === String(config.category))?.name || t("exams.category.any")
    : t("exams.category.any");
  // Hints are okay; but "did save" must be truthful only:
  const canSave = Boolean(user?.id);
  // We saved server-side right after finishing if signed in (see Challenge).

  return (
    <div className="kc-result">
      <div className="kc-result__score">
        <span className="kc-result__pct">{accuracy}%</span>
        <span className="kc-result__line">{correct} / {total} {t("exams.result.correctAnswers")}</span>
      </div>
      <dl className="kc-result__stats">
        <div><dt>{t("exams.result.total")}</dt><dd>{total}</dd></div>
        <div><dt>{t("exams.result.correct")}</dt><dd>{correct}</dd></div>
        <div><dt>{t("exams.result.incorrect")}</dt><dd>{total - correct}</dd></div>
        <div><dt>{t("exams.result.time")}</dt><dd>{fmtTime(timeSpentSec)}</dd></div>
        <div><dt>{t("exams.setup.category")}</dt><dd>{categoryName}</dd></div>
        <div><dt>{t("exams.setup.difficulty")}</dt><dd>{config?.difficulty ? t(`exams.difficulty.${config.difficulty}`) : t("exams.difficulty.any")}</dd></div>
      </dl>

      <p className="kc-result__note">{t("exams.result.note")}</p>

      {saved === true && <p className="kc-result__saved is-ok">{t("exams.result.saved")}</p>}
      {saved === false && <p className="kc-result__saved is-fail">{t("exams.result.saveFailed")}</p>}

      <div className="kc-result__actions">
        <button className="kc-btn kc-btn--primary" onClick={onRetry}><RetryIcon size={15} strokeWidth={2} aria-hidden />{t("exams.result.retry")}</button>
        <button className="kc-btn" onClick={onNew}>{t("exams.result.tryAnother")}</button>
        <button className="kc-btn" onClick={onReview}>{t("exams.result.review")}</button>
      </div>
      {saving && <span className="mini-spinner" aria-hidden />}
    </div>
  );
};

/* ── Review answers ── */
const Review = ({ answers, onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="kc-review">
      <button className="kc-btn" onClick={onBack}>{t("common.back")}</button>
      <ul className="kc-review__list">
        {answers.map((a, i) => (
          <li key={i} className={`kc-review__item ${a.isCorrect ? "is-correct" : "is-wrong"}`}>
            <span className="kc-review__q" dir="auto">{i + 1}. {a.question}</span>
            <span className="kc-review__your" dir="auto">{t("exams.review.your")}: {a.answer}</span>
            {!a.isCorrect && <span className="kc-review__correct" dir="auto">{t("exams.review.correct")}: {a.correctAnswer}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ── History (signed-in only) ── */
const History = ({ items, onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="kc-history">
      <button className="kc-btn" onClick={onBack}>{t("common.back")}</button>
      {items.length === 0 && <p className="kc-empty">{t("exams.history.empty")}</p>}
      <ul className="kc-history__list">
        {items.map((r, i) => (
          <li key={r.sessionId || i} className="kc-history__item">
            <span>{r.categoryName || t("exams.category.any")} · {t(`exams.difficulty.${r.difficulty || "any"}`)}</span>
            <span className="kc-history__score">{r.correct}/{r.total} · {r.accuracy}%</span>
            <span className="kc-history__date">{r.savedAt ? new Date(r.savedAt).toLocaleDateString() : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ── Main container ── */
export const KnowledgeChallenges = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stage, setStage] = useState("setup"); // setup | loading | play | result | review | history
  const [categories, setCategories] = useState([]);
  const [catState, setCatState] = useState("loading"); // loading | ok | error
  const [session, setSession] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [lastConfig, setLastConfig] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [history, setHistory] = useState([]);

  const loadCategories = useCallback(async () => {
    setCatState("loading");
    const r = await fetchCategories();
    if (r.ok) { setCategories(r.categories); setCatState("ok"); }
    else setCatState("error");
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // history only matters for signed-in users (guests: session-only)
  useEffect(() => {
    if (!user?.id) return;
    fetchHistory().then((r) => { if (r.ok) setHistory(r.history); });
  }, [user?.id]);

  const start = async (config) => {
    setStarting(true);
    setStartError(null);
    const r = await createSession(config);
    setStarting(false);
    if (!r.ok) {
      setStartError(r.code === "NOT_ENOUGH_QUESTIONS" ? t("exams.error.notEnough") : t("exams.error.start"));
      return;
    }
    setLastConfig(config);
    setSession(r);
    setStage("play");
  };

  const finish = async ({ answers, timeSpentSec }) => {
    setResultData({ answers, timeSpentSec });
    setStage("result");
    // حفظ فوري للمسجل — النتيجة تُحسب على الخادم من المفتاح السرّي للجلسة
    if (user?.id && session?.sessionId) {
      await saveResult({
        sessionId: session.sessionId,
        config: { ...lastConfig, categoryName: categories.find((c) => String(c.id) === String(lastConfig?.category))?.name || "" },
        answers: answers.map((a) => ({ question: a.question, answer: a.answer })),
        timeSpentSec,
      });
      fetchHistory().then((r) => { if (r.ok) setHistory(r.history); });
    }
  };

  return (
    <div className="kc">
      <header className="kc__head">
        <h2>{t("exams.title")}</h2>
        <p>{t("exams.subtitle")}</p>
        <span className="kc__source">{t("exams.sourceNote")}</span>
      </header>

      {catState === "loading" && stage === "setup" && <div className="kc-state"><span className="mini-spinner" /> {t("common.loading")}</div>}
      {catState === "error" && stage === "setup" && (
        <div className="kc-state kc-state--error">
          <p>{t("exams.error.categories")}</p>
          <button className="kc-btn" onClick={loadCategories}><RetryIcon size={14} strokeWidth={2} aria-hidden /> {t("common.retry")}</button>
        </div>
      )}
      {startError && stage === "setup" && <div className="kc-state kc-state--error" role="alert">{startError}</div>}

      {stage === "setup" && catState === "ok" && (
        <Setup
          categories={categories}
          onStart={start}
          starting={starting}
          history={user?.id ? history : []}
          onOpenHistory={() => setStage("history")}
        />
      )}

      {stage === "play" && session && (
        <Player
          sessionId={session.sessionId}
          questions={session.questions}
          config={session.config}
          onDone={finish}
        />
      )}

      {stage === "result" && resultData && (
        <Result
          config={lastConfig}
          answers={resultData.answers}
          timeSpentSec={resultData.timeSpentSec}
          categories={categories}
          onRetry={() => start(lastConfig)}
          onNew={() => { setSession(null); setResultData(null); setStage("setup"); }}
          onReview={() => setStage("review")}
        />
      )}

      {stage === "review" && resultData && (
        <Review answers={resultData.answers} onBack={() => setStage("result")} />
      )}

      {stage === "history" && (
        <History items={history} onBack={() => setStage("setup")} />
      )}
    </div>
  );
};

export default KnowledgeChallenges;
