/**
 * QuranSection — the single-slot Quran section inside the Focus Space
 * soundscape. Plays through the GLOBAL AudioEngine, so recitation NEVER
 * mixes with the ambient mixer and only one audio element exists.
 *
 * Reciter + surah pickers use the SAME verified mp3quran catalog as the
 * Discovery Hub Quran tab — a selection plays the identical audio.
 */
import React, { useCallback, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useAudio } from "../../audio/AudioContext";
import { QURAN_CATALOG, RECITERS } from "../../audio/constants/audioCatalog";
import { PlayIcon, PauseIcon } from "../constants/focusIcons";
import "../styles/focus-space.css";

export const QuranSection = () => {
  const { t } = useTranslation();
  const { playTrack, currentTrack, isPlaying, toggle } = useAudio();
  const [reciter, setReciter] = useState(RECITERS[0]);
  const [surah, setSurah] = useState(1);

  const surahs = QURAN_CATALOG.filter((tr) => tr.reciterId === reciter.id);

  const selected = surahs.find((tr) => tr.surahNumber === surah);
  const isCurrent = currentTrack?.id === selected?.id;

  const handlePlay = useCallback(() => {
    if (!selected) return;
    if (isCurrent) toggle();
    else playTrack(selected);
  }, [selected, isCurrent, playTrack, toggle]);

  return (
    <div className="fc-quran">
      <div className="fc-quran__header">{t("focus.quran.title")}</div>
      <p className="fc-quran__note">{t("focus.quran.note")}</p>
      <div className="fc-quran__row">
        <select
          className="fc-select"
          value={reciter.id}
          onChange={(e) => {
            const next = RECITERS.find((r) => r.id === e.target.value);
            setReciter(next);
            setSurah(1);
          }}
          aria-label={t("focus.quran.reciter")}
        >
          {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          className="fc-select"
          value={surah}
          onChange={(e) => setSurah(Number(e.target.value))}
          aria-label={t("focus.quran.surah")}
        >
          {surahs.map((tr) => (
            <option key={tr.id} value={tr.surahNumber}>{tr.surahNumber}. {tr.surahName}</option>
          ))}
        </select>
      </div>
      <div className="fc-quran__row fc-quran__controls">
        <button className="fc-btn fc-btn--primary" onClick={handlePlay}>
          {isCurrent && isPlaying
            ? <><PauseIcon size={14} strokeWidth={2} aria-hidden /> {t("focus.quran.pause")}</>
            : <><PlayIcon size={14} strokeWidth={2} aria-hidden /> {t("focus.quran.play")}</>}
        </button>
      </div>
    </div>
  );
};

export default React.memo(QuranSection);
