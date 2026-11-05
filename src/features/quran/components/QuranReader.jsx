/**
 * QuranReader — AlQuran Cloud-powered Quran reading inside Focus Space.
 *
 * يطوّر QuranSection الحالي دون استبدال تصميم القسم: نص عثماني رسمي،
 * ترجمات موثوقة، قراء من الواجهة الرسمية، تلاوة عبر AudioEngine الموحد،
 * حفظ الموضع (Continue Reading) وإشارات مرجعية في بنية user_data الحالية.
 *
 * الدقة: النص يمرر كما هو — لا AI، لا mock، ولا تعديل ترتيب.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import useAuth from "../../../hooks/useAuth";
import { useAudio } from "../../audio/AudioContext";
import {
  fetchSurahs, fetchSurah, fetchTranslations, fetchReciters,
  fetchProgress, saveProgress, toggleBookmark, fetchBookmarks,
} from "../services/quran.service";
import {
  PlayIcon, PauseIcon, SkipForwardIcon, SkipBackwardIcon,
  BookmarkIcon, ShareIcon, SearchIcon, VolumeIcon, MuteIcon,
} from "../../focus-space/constants/focusIcons";
import "./quran.css";

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** قائمة السور + بحث باسم/رقم */
const SurahPicker = ({ surahs, current, onPick, onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    const asNum = Number(q);
    return surahs.filter((s) =>
      (Number.isFinite(asNum) && asNum > 0 && s.number === asNum) ||
      s.name.toLowerCase().includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      (s.englishNameTranslation || "").toLowerCase().includes(q)
    );
  }, [surahs, query]);

  return (
    <div className="qr-picker">
      <div className="qr-picker__bar">
        <SearchIcon size={14} strokeWidth={1.75} aria-hidden />
        <input
          className="qr-picker__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("quran.searchPlaceholder")}
          aria-label={t("quran.searchPlaceholder")}
          autoFocus
        />
      </div>
      <ul className="qr-picker__list">
        {filtered.length === 0 && <li className="qr-picker__empty">{t("quran.noResults")}</li>}
        {filtered.map((s) => (
          <li key={s.number}>
            <button
              className={`qr-picker__row ${current === s.number ? "is-current" : ""}`}
              onClick={() => onPick(s.number)}
            >
              <span className="qr-picker__num">{s.number}</span>
              <span className="qr-picker__names">
                <strong dir="rtl">{s.name.replace("سُورَةُ ", "")}</strong>
                <span>{s.englishName} · {s.englishNameTranslation}</span>
              </span>
              <span className="qr-picker__meta">{s.numberOfAyahs} {t("quran.ayahs")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** مشغل التلاوة — عبر AudioEngine الموحد (آية-آية مع auto-advance) */
const ReciterBar = ({ surah, reciterId, reciters, onReciterChange, ayahIndex, onAyahIndex }) => {
  const { t } = useTranslation();
  const { currentTrack, isPlaying, toggle, next, previous, duration, positionSec, volume, muted, setVolume, toggleMute } = useAudio();
  const ayah = surah?.ayahs?.[ayahIndex];
  const isCurrentAyah = currentTrack?.id?.startsWith?.(`qr:${surah?.number}:${ayah?.number}`);

  if (!reciters.length) return null;

  return (
    <div className="qr-reciter">
      <select
        className="qr-select"
        value={reciterId}
        onChange={(e) => onReciterChange(e.target.value)}
        aria-label={t("quran.reciter")}
      >
        {reciters.map((r) => <option key={r.identifier} value={r.identifier}>{r.name}</option>)}
      </select>

      <div className="qr-reciter__controls">
        <button className="qr-btn" onClick={previous} aria-label={t("audio.prev")}>
          <SkipBackwardIcon size={16} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          className="qr-btn qr-btn--play"
          onClick={toggle}
          disabled={!ayah?.audioUrl}
          aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
          title={!ayah?.audioUrl ? t("quran.noAudio") : undefined}
        >
          {isPlaying && isCurrentAyah ? <PauseIcon size={16} strokeWidth={2} aria-hidden /> : <PlayIcon size={16} strokeWidth={2} aria-hidden />}
        </button>
        <button className="qr-btn" onClick={next} aria-label={t("audio.next")}>
          <SkipForwardIcon size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {isCurrentAyah && duration > 0 && (
        <div className="qr-reciter__progress">
          <span>{fmt(positionSec)}</span>
          <div className="qr-reciter__bar" aria-hidden><div style={{ width: `${(positionSec / duration) * 100}%` }} /></div>
          <span>{fmt(duration)}</span>
        </div>
      )}

      <div className="qr-reciter__volume">
        <button className="qr-btn" onClick={toggleMute} aria-pressed={muted} aria-label={t("focus.sounds.mute")}>
          {muted ? <MuteIcon size={14} strokeWidth={1.75} aria-hidden /> : <VolumeIcon size={14} strokeWidth={1.75} aria-hidden />}
        </button>
        <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))} aria-label={t("focus.sounds.master")} />
      </div>
    </div>
  );
};

export const QuranReader = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { playTrack } = useAudio();

  const [stage, setStage] = useState("surahs"); // surahs | reading
  const [surahList, setSurahList] = useState([]);
  const [surahState, setSurahState] = useState("loading"); // loading | ok | error
  const [surahNumber, setSurahNumber] = useState(null);
  const [surah, setSurah] = useState(null);
  const [surahLoading, setSurahLoading] = useState(false);
  const [surahError, setSurahError] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [reciters, setReciters] = useState([]);
  const [translationId, setTranslationId] = useState(localStorage.getItem("quranTranslation") || "en.sahih");
  const [showTranslation, setShowTranslation] = useState(true);
  const [reciterId, setReciterId] = useState(localStorage.getItem("quranReciter") || "ar.alafasy");
  const [fontSize, setFontSize] = useState(Number(localStorage.getItem("quranFontSize") || 26));
  const [ayahIndex, setAyahIndex] = useState(0);
  const [continueTarget, setContinueTarget] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const ayahRefs = useRef({});

  /* ── initial load: surahs + translations + reciters + progress ── */
  useEffect(() => {
    let dead = false;
    (async () => {
      setSurahState("loading");
      const [s, tr, rc] = await Promise.all([fetchSurahs(), fetchTranslations(), fetchReciters()]);
      if (dead) return;
      if (!s.ok) { setSurahState("error"); return; }
      setSurahList(s.surahs);
      setSurahState("ok");
      if (tr.ok) setTranslations(tr.translations);
      if (rc.ok) {
        // نعرض فقط القراء الذين توفر لهم صوت 128kbps (الأوسع توفرًا)
        setReciters(rc.reciters);
      }
      // Continue Reading — للمسجل فقط
      if (user?.id) {
        const [p, bm] = await Promise.all([fetchProgress(), fetchBookmarks()]);
        if (!dead && p.ok && p.progress?.surah) setContinueTarget(p.progress);
        if (!dead && bm.ok) setBookmarks(bm.bookmarks);
      }
    })();
    return () => { dead = true; };
  }, [user?.id]);

  /* ── open a surah ── */
  const openSurah = useCallback(async (number, targetAyah = 1) => {
    setSurahNumber(number);
    setAyahIndex(Math.max(0, targetAyah - 1));
    setSurahLoading(true);
    setSurahError(null);
    setStage("reading");
    const r = await fetchSurah(number, { translation: translationId || undefined, reciter: reciterId });
    setSurahLoading(false);
    if (!r.ok) { setSurahError(r.error || "FAILED"); return; }
    setSurah(r.surah);
  }, [translationId, reciterId]);

  /* reload when translation/reciter changes while reading */
  useEffect(() => {
    if (stage !== "reading" || !surahNumber) return;
    let dead = false;
    (async () => {
      setSurahLoading(true);
      setSurahError(null);
      const r = await fetchSurah(surahNumber, { translation: translationId || undefined, reciter: reciterId });
      if (dead) return;
      setSurahLoading(false);
      if (!r.ok) { setSurahError(r.error || "FAILED"); return; }
      setSurah(r.surah);
    })();
    return () => { dead = true; };
  }, [translationId, reciterId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── save reading progress (debounced by ayah change only) ── */
  const progressTimer = useRef(null);
  useEffect(() => {
    if (stage !== "reading" || !surahNumber) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      if (user?.id) saveProgress(surahNumber, surah?.ayahs?.[ayahIndex]?.number || 1);
    }, 1200);
    return () => clearTimeout(progressTimer.current);
  }, [stage, surahNumber, ayahIndex, surah, user?.id]);

  /* ── play current ayah ── */
  const playAyah = useCallback((idx) => {
    const ayah = surah?.ayahs?.[idx];
    if (!ayah?.audioUrl) return; // لا زر تشغيل بلا مصدر صوت صالح
    // قائمة التلاوة = بقية آيات السورة المتاحة صوتيًا
    const queue = surah.ayahs
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => Boolean(a.audioUrl))
      .map(({ a, i }) => ({
        id: `qr:${surah.number}:${a.number}`,
        title: `${surah.name.replace("سُورَةُ ", "")} — ${t("quran.ayah")} ${a.number}`,
        author: reciters.find((r) => r.identifier === reciterId)?.name || reciterId,
        audioUrl: a.audioUrl,
        thumbnail: null,
        durationSec: 0,
        _ayahIndex: i,
      }));
    const track = queue.find((tr) => tr._ayahIndex === idx) || queue[0];
    if (!track) return;
    playTrack(track, { queue });
  }, [surah, reciterId, reciters, playTrack, t]);

  const isBookmark = (surahNum, ayahNum) => bookmarks.some((b) => b.surah === surahNum && b.ayah === ayahNum);

  const onBookmark = async (surahNum, ayahNum) => {
    if (!user?.id) return; // bookmarks للمسجل — الزائر يقرأ دون حفظ
    const r = await toggleBookmark(surahNum, ayahNum);
    if (r.ok) {
      const bm = await fetchBookmarks();
      if (bm.ok) setBookmarks(bm.bookmarks);
    }
  };

  const shareAyah = async (surahNum, surahName, ayahNum, text) => {
    const label = `${text}\n\n— ${surahName} (${surahNum}:${ayahNum})`;
    try {
      if (navigator.share) await navigator.share({ title: `${surahName} ${surahNum}:${ayahNum}`, text: label });
      else { await navigator.clipboard.writeText(label); }
    } catch { /* user dismissed — silent */ }
  };

  /* ── render ── */
  if (surahState === "loading") {
    return <div className="qr qr--center"><span className="mini-spinner" /> {t("common.loading")}</div>;
  }
  if (surahState === "error") {
    return (
      <div className="qr qr--center">
        <p>{t("quran.error.surahs")}</p>
        <button className="qr-btn" onClick={() => window.location.reload()}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="qr" dir="rtl">
      {/* header */}
      <div className="qr__head">
        {stage === "reading" ? (
          <>
            <button className="qr-btn" onClick={() => setStage("surahs")} aria-label={t("common.back")}>←</button>
            <strong className="qr__title">{surah ? surah.name.replace("سُورَةُ ", "") : ""}</strong>
            {surah && <span className="qr__meta">{surah.englishName} · {surah.numberOfAyahs} {t("quran.ayahs")}</span>}
          </>
        ) : (
          <>
            <strong className="qr__title">{t("quran.title")}</strong>
            <button className="qr-btn" onClick={onClose} aria-label={t("common.close")}>✕</button>
          </>
        )}
      </div>

      {/* continue reading banner */}
      {stage === "surahs" && continueTarget && (
        <button className="qr-continue" onClick={() => openSurah(continueTarget.surah, continueTarget.ayah)}>
          {t("quran.continueReading")}: {surahList.find((s) => s.number === continueTarget.surah)?.name.replace("سُورَةُ ", "") || continueTarget.surah} — {t("quran.ayah")} {continueTarget.ayah}
        </button>
      )}

      {/* surah list */}
      {stage === "surahs" && (
        <SurahPicker surahs={surahList} current={surahNumber} onPick={(n) => openSurah(n)} onClose={onClose} />
      )}

      {/* reading */}
      {stage === "reading" && (
        <>
          {/* controls: font size + translation + source */}
          <div className="qr__toolbar">
            <div className="qr__fontsize">
              <button className="qr-chip" onClick={() => { const v = Math.max(20, fontSize - 2); setFontSize(v); localStorage.setItem("quranFontSize", String(v)); }} aria-label={t("readLater.smaller")}>أ−</button>
              <button className="qr-chip" onClick={() => { const v = Math.min(44, fontSize + 2); setFontSize(v); localStorage.setItem("quranFontSize", String(v)); }} aria-label={t("readLater.bigger")}>أ+</button>
            </div>
            <label className="qr__showtr">
              <input type="checkbox" checked={showTranslation} onChange={(e) => setShowTranslation(e.target.checked)} />
              {t("quran.showTranslation")}
            </label>
            <select className="qr-select qr-select--tr" value={translationId} onChange={(e) => { setTranslationId(e.target.value); localStorage.setItem("quranTranslation", e.target.value); }} aria-label={t("quran.translation")}>
              <option value="">{t("quran.translationNone")}</option>
              {translations.map((tr) => <option key={tr.identifier} value={tr.identifier}>{tr.name} ({tr.language})</option>)}
            </select>
          </div>

          {surahLoading && <div className="qr--center"><span className="mini-spinner" /></div>}
          {surahError && !surahLoading && (
            <div className="qr--center">
              <p>{t("quran.error.surah")}</p>
              <button className="qr-btn" onClick={() => openSurah(surahNumber, surah?.ayahs?.[ayahIndex]?.number || 1)}>{t("common.retry")}</button>
            </div>
          )}

          {surah && !surahLoading && (
            <>
              {/* reciter bar */}
              <ReciterBar
                surah={surah}
                reciterId={reciterId}
                reciters={reciters}
                ayahIndex={ayahIndex}
                onReciterChange={(id) => { setReciterId(id); localStorage.setItem("quranReciter", id); }}
              />

              {/* ayahs */}
              <div className="qr__body" style={{ "--qr-font": `${fontSize}px` }}>
                {surah.ayahs.map((a, i) => {
                  const bm = isBookmark(surah.number, a.number);
                  return (
                    <div
                      key={a.number}
                      ref={(el) => { ayahRefs.current[i] = el; }}
                      className={`qr-ayah ${i === ayahIndex ? "is-active" : ""}`}
                      onClick={() => setAyahIndex(i)}
                    >
                      <div className="qr-ayah__arabic" dir="rtl">
                        <span className="qr-ayah__num">{a.number}</span>
                        {a.text}
                      </div>
                      {showTranslation && a.translation && (
                        <div className="qr-ayah__translation" dir="ltr">{a.translation}</div>
                      )}
                      <div className="qr-ayah__actions">
                        {a.audioUrl && (
                          <button className="qr-btn qr-btn--sm" onClick={(e) => { e.stopPropagation(); setAyahIndex(i); playAyah(i); }} aria-label={t("common.play")}>
                            <PlayIcon size={13} strokeWidth={2} aria-hidden />
                          </button>
                        )}
                        {user?.id && (
                          <button
                            className={`qr-btn qr-btn--sm ${bm ? "is-bookmarked" : ""}`}
                            onClick={(e) => { e.stopPropagation(); onBookmark(surah.number, a.number); }}
                            aria-label={t("quran.bookmark")}
                            aria-pressed={bm}
                          >
                            <BookmarkIcon size={13} strokeWidth={2} aria-hidden />
                          </button>
                        )}
                        <button className="qr-btn qr-btn--sm" onClick={(e) => { e.stopPropagation(); shareAyah(surah.number, surah.name.replace("سُورَةُ ", ""), a.number, a.text); }} aria-label={t("quran.share")}>
                          <ShareIcon size={13} strokeWidth={2} aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* source attribution — المصداقية */}
              <div className="qr__source">
                {t("quran.sourceText")}: api.alquran.cloud (quran-uthmani)
                {translationId && ` · ${translations.find((tr) => tr.identifier === translationId)?.name || translationId}`}
                {reciterId && ` · ${reciters.find((r) => r.identifier === reciterId)?.name || reciterId}`}
              </div>

              {/* next/prev surah */}
              <div className="qr__nav">
                {surahNumber > 1 && (
                  <button className="qr-btn" onClick={() => openSurah(surahNumber - 1)}>
                    {surahList.find((s) => s.number === surahNumber - 1)?.name.replace("سُورَةُ ", "")}
                  </button>
                )}
                {surahNumber < 114 && (
                  <button className="qr-btn" onClick={() => openSurah(surahNumber + 1)}>
                    {surahList.find((s) => s.number === surahNumber + 1)?.name.replace("سُورَةُ ", "")}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default QuranReader;
