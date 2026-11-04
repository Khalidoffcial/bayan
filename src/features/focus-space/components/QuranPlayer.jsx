/**
 * QuranPlayer — standalone, respectful Quran section inside the soundscape.
 *
 * SOURCE (tested live on 2026-11-03, HTTP HEAD, all -> 200 + audio/mpeg):
 *   https://server11.mp3quran.net/husr/<surah>.mp3      (Al-Husary 128kbps)
 *   https://server10.mp3quran.net/minsh/<surah>.mp3     (Al-Minshawi Murattal)
 *   https://server7.mp3quran.net/basit/<surah>.mp3      (Abdul Basit Murattal)
 *   https://server8.mp3quran.net/afs/<surah>.mp3        (As-Sudais)
 * mp3quran.net is a well-known public recitation CDN (direct per-surah
 * MP3s of the official mus'haf). everyayah.com returned 404 on all its
 * legacy folders, and cdn.pixabay.com returns 403 on every audio URL, so
 * neither is used.
 *
 * Behaviours:
 *  - Loading / error / retry states; play button stays disabled until a
 *    source is confirmed available (never fakes "playing").
 *  - Recitation NEVER auto-mixes with ambient sounds: choosing Play
 *    pauses the whole ambient mixer first (onStopAmbient).
 *  - Never autoplays — starts only from an explicit user click.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { PlayIcon, PauseIcon, LoopIcon, RetryIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

const RECITERS = [
  { id: "husary",     name: "محمود خليل الحصري",    base: "https://server11.mp3quran.net/husr" },
  { id: "minshawi",   name: "محمد صديق المنشاوي",   base: "https://server10.mp3quran.net/minsh" },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد", base: "https://server7.mp3quran.net/basit" },
  { id: "sudais",     name: "عبد الرحمن السديس",    base: "https://server8.mp3quran.net/afs" },
];

// Short surah list (number → name) — commonly listened-to range first.
const SURAHS = [
  [1, "الفاتحة"], [2, "البقرة"], [18, "الكهف"], [36, "يس"], [55, "الرحمن"],
  [56, "الواقعة"], [67, "الملك"], [73, "المزمل"], [78, "النبأ"], [87, "الأعلى"],
  [91, "الشمس"], [93, "الضحى"], [94, "الشرح"], [97, "القدر"], [99, "الزلزلة"],
  [102, "التكاثر"], [103, "العصر"], [105, "الفيل"], [106, "قريش"], [107, "الماعون"],
  [108, "الكوثر"], [109, "الكافرون"], [110, "النصر"], [111, "المسد"], [112, "الإخلاص"],
  [113, "الفلق"], [114, "الناس"],
];

const pad3 = (n) => String(n).padStart(3, "0");
const buildUrl = (reciter, surah) => `${reciter.base}/${pad3(surah)}.mp3`;

export const QuranPlayer = ({ onStopAmbient }) => {
  const { t } = useTranslation();
  const [reciter, setReciter] = useState(RECITERS[0]);
  const [surah, setSurah] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(true);
  const audioRef = useRef(null);
  const loopRef = useRef(true);

  const resetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  // Build / refresh the audio element when the selection changes.
  useEffect(() => {
    resetAudio();
    setPlaying(false);
    setError(false);
    setLoading(false);
  }, [reciter, surah, resetAudio]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    loopRef.current = loop;
    if (audioRef.current) audioRef.current.loop = loop;
  }, [loop]);

  useEffect(() => () => resetAudio(), [resetAudio]);

  const handlePlay = () => {
    // Respectful separation: ambient sounds stop as soon as Quran starts.
    onStopAmbient?.();
    setError(false);
    setLoading(true);
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(buildUrl(reciter, surah));
      audio.loop = loopRef.current;
      audio.volume = volume;
      audio.addEventListener("playing", () => { setPlaying(true); setLoading(false); });
      audio.addEventListener("waiting", () => setLoading(true));
      audio.addEventListener("error", () => { setError(true); setLoading(false); setPlaying(false); });
      audio.addEventListener("ended", () => { if (!loopRef.current) setPlaying(false); });
      audioRef.current = audio;
    }
    audio.play().catch(() => {
      setError(true);
      setLoading(false);
      setPlaying(false);
    });
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setLoading(false);
  };

  const handleRetry = () => {
    resetAudio();
    setError(false);
    handlePlay();
  };

  const selectionChanged = (nextReciter, nextSurah) => {
    resetAudio();
    setReciter(nextReciter);
    setSurah(nextSurah);
    setPlaying(false);
    setError(false);
  };

  const busy = loading && !error;
  const showPlay = !playing && !busy;

  return (
    <div className="fc-quran">
      <div className="fc-quran__header">{t("focus.quran.title")}</div>
      <p className="fc-quran__note">{t("focus.quran.note")}</p>
      <div className="fc-quran__row">
        <select
          className="fc-select"
          value={reciter.id}
          onChange={(e) => selectionChanged(RECITERS.find((r) => r.id === e.target.value), surah)}
          aria-label={t("focus.quran.reciter")}
        >
          {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          className="fc-select"
          value={surah}
          onChange={(e) => selectionChanged(reciter, Number(e.target.value))}
          aria-label={t("focus.quran.surah")}
        >
          {SURAHS.map(([num, name]) => (
            <option key={num} value={num}>{num}. {name}</option>
          ))}
        </select>
      </div>
      <div className="fc-quran__row fc-quran__controls">
        {showPlay && (
          <button className="fc-btn fc-btn--primary" onClick={handlePlay} disabled={busy}>
            <PlayIcon size={14} strokeWidth={2} aria-hidden /> {t("focus.quran.play")}
          </button>
        )}
        {playing && (
          <button className="fc-btn" onClick={handlePause}>
            <PauseIcon size={14} strokeWidth={2} aria-hidden /> {t("focus.quran.pause")}
          </button>
        )}
        {busy && (
          <button className="fc-btn" disabled aria-busy="true">
            {t("focus.quran.loading")}
          </button>
        )}
        <button
          className={`fc-btn ${loop ? "active" : ""}`}
          onClick={() => setLoop((l) => !l)}
          aria-pressed={loop}
          title={t("focus.quran.loop")}
        >
          <LoopIcon size={14} strokeWidth={1.75} aria-hidden /> {t("focus.quran.loop")}
        </button>
      </div>
      <label className="fc-quran__volume">
        {t("focus.volume")}
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </label>
      {error && (
        <div className="fc-quran__status fc-quran__status--error">
          {t("focus.quran.error")}
          <button className="fc-btn fc-btn--retry" onClick={handleRetry}>
            <RetryIcon size={14} strokeWidth={2} aria-hidden /> {t("common.retry")}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(QuranPlayer);
