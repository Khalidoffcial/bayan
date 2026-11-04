/**
 * AudioLibrary — full-screen audio browser for Bayan Space.
 *
 * Three visually and functionally separate sections:
 *   - Music     (moods: calm / ambient / cinematic / lofi / focus)
 *   - Quran     (reciter + surah picker, honest no auto-mix)
 *   - Nature    (ambient loops; slots needing local files say so)
 *
 * Unified search across sections. Uses ONLY verified sources from the
 * catalog — nothing fake, no pretend players.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { MUSIC_MOODS, searchTracks } from "./constants/audioCatalog";
import { useAudio } from "./AudioContext";
import {
  PlayIcon, PauseIcon, SearchIcon, CloseIcon, QuranIcon,
  NatureIcon, MusicIcon, CheckIcon,
} from "../focus-space/constants/focusIcons";
import "./audio.css";

const SECTIONS = [
  { key: "music", icon: MusicIcon },
  { key: "quran", icon: QuranIcon },
  { key: "nature", icon: NatureIcon },
];

export const AudioLibrary = ({ onClose }) => {
  const { t } = useTranslation();
  const { currentTrackId, isPlaying, playTrack, toggle } = useAudio();
  const [section, setSection] = useState("music");
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState(null);

  const tracks = useMemo(
    () => searchTracks(query, { section, mood }),
    [query, section, mood]
  );

  return (
    <div className="audio-library" role="dialog" aria-modal="true" aria-label={t("audio.library")}>
      <div className="audio-library__head">
        <strong className="audio-library__title">{t("audio.library")}</strong>
        <div className="audio-library__search">
          <SearchIcon size={16} strokeWidth={1.75} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("audio.search")}
            aria-label={t("audio.search")}
          />
        </div>
        <button className="fc-panel__close" onClick={onClose} aria-label={t("common.close")}>
          <CloseIcon size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="audio-library__tabs" role="tablist">
        {SECTIONS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={section === key}
            className={`audio-tab ${section === key ? "active" : ""}`}
            onClick={() => setSection(key)}
          >
            <Icon size={17} strokeWidth={1.75} aria-hidden />
            {t(`audio.section.${key}`)}
          </button>
        ))}
      </div>

      {section === "music" && (
        <div className="audio-moods" role="group" aria-label={t("audio.moods")}>
          {MUSIC_MOODS.map((m) => (
            <button
              key={m}
              className={`audio-mood ${mood === m ? "active" : ""}`}
              onClick={() => setMood(mood === m ? null : m)}
              aria-pressed={mood === m}
            >
              {t(`audio.mood.${m}`)}
            </button>
          ))}
        </div>
      )}

      <div className="audio-library__list">
        {tracks.length === 0 && (
          <div className="fc-empty">{t("audio.empty")}</div>
        )}
        {tracks.map((track) => {
          const isCurrent = track.id === currentTrackId;
          return (
            <button
              key={track.id}
              className={`audio-track ${isCurrent ? "is-current" : ""}`}
              onClick={() => (isCurrent ? toggle() : playTrack(track.id))}
            >
              <span className="audio-track__glyph" aria-hidden>
                {isCurrent && isPlaying ? <PauseIcon size={15} strokeWidth={2} /> : <PlayIcon size={15} strokeWidth={2} />}
              </span>
              <span className="audio-track__meta">
                <strong>{track.title}</strong>
                <span>{track.artist || t("audio.unknownArtist")}</span>
              </span>
              <span className="audio-track__src">{track.sourceLabel || ""}</span>
              {isCurrent && <CheckIcon size={14} strokeWidth={2} aria-hidden />}
            </button>
          );
        })}
      </div>

      {section === "quran" && (
        <p className="audio-note">{t("audio.quranNote")}</p>
      )}
      {section === "nature" && (
        <p className="audio-note">{t("audio.natureNote")}</p>
      )}
    </div>
  );
};

export default AudioLibrary;
