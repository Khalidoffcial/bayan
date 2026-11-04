/**
 * MiniPlayer — persistent bottom bar for the global audio engine.
 *
 * Mounted once at the app root (in AudioShell) — it survives route
 * changes because it is OUTSIDE <Routes>. Hidden entirely when nothing
 * has ever played. Shows section glyph/title/source, play/pause,
 * prev/next, seek bar, time, volume, speed, repeat, shuffle, and expand.
 */
import React, { useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import {
  PlayIcon, PauseIcon, SkipBackwardIcon, SkipForwardIcon,
  VolumeIcon, MuteIcon, LoopIcon, ShuffleIcon,
  QuranIcon, MusicIcon, NatureIcon,
} from "../focus-space/constants/focusIcons";
import { useAudio } from "./AudioContext";
import "./audio.css";

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

const SECTION_GLYPHS = {
  quran: QuranIcon,
  nature: NatureIcon,
  music: MusicIcon,
};

export const MiniPlayer = ({ onExpand }) => {
  const { t } = useTranslation();
  const {
    currentTrack, isPlaying, isLoading, error,
    positionSec, duration, volume, muted, rate, repeat, shuffle,
    toggle, next, previous, seekTo, setVolume, toggleMute,
    cycleRepeat, toggleShuffle, setRate,
  } = useAudio();
  const [speedOpen, setSpeedOpen] = useState(false);

  if (!currentTrack) return null;

  const SectionGlyph = SECTION_GLYPHS[currentTrack.section] || MusicIcon;
  const sectionLabel = t(`audio.section.${currentTrack.section}`);

  return (
    <div className="mini-player" role="region" aria-label={t("audio.player")}>
      <button className="mini-player__info" onClick={onExpand} aria-label={t("audio.expand")}>
        <span className="mini-player__art" aria-hidden>
          <SectionGlyph size={17} strokeWidth={1.75} />
        </span>
        <span className="mini-player__meta">
          <strong className="mini-player__title">{currentTrack.title}</strong>
          <span className="mini-player__sub">
            {sectionLabel}{currentTrack.author || currentTrack.reciter || currentTrack.artist ? ` · ${currentTrack.author || currentTrack.reciter || currentTrack.artist}` : ""}
          </span>
        </span>
      </button>

      <div className="mini-player__controls">
        <button className="mini-btn" onClick={previous} aria-label={t("audio.prev")}>
          <SkipBackwardIcon size={16} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          className="mini-btn mini-btn--play"
          onClick={toggle}
          aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
          disabled={isLoading || Boolean(error)}
        >
          {isLoading ? <span className="mini-spinner" aria-hidden /> : isPlaying
            ? <PauseIcon size={18} strokeWidth={2} aria-hidden />
            : <PlayIcon size={18} strokeWidth={2} aria-hidden />}
        </button>
        <button className="mini-btn" onClick={next} aria-label={t("audio.next")}>
          <SkipForwardIcon size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="mini-player__seek">
        <span className="mini-time">{fmt(positionSec)}</span>
        <input
          type="range" min="0" max={duration || 0} step="1"
          value={positionSec}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label={t("audio.seek")}
          disabled={!duration}
        />
        <span className="mini-time">{fmt(duration)}</span>
      </div>

      <div className="mini-player__extra">
        <button
          className={`mini-btn ${repeat !== "off" ? "is-active" : ""}`}
          onClick={cycleRepeat}
          aria-pressed={repeat !== "off"}
          aria-label={t("audio.repeat")}
          title={repeat === "one" ? t("audio.repeatOne") : repeat === "all" ? t("audio.repeatAll") : t("audio.repeat")}
        >
          <LoopIcon size={15} strokeWidth={1.75} aria-hidden />
          {repeat === "one" && <span className="mini-flag">1</span>}
        </button>
        <button
          className={`mini-btn ${shuffle ? "is-active" : ""}`}
          onClick={toggleShuffle}
          aria-pressed={shuffle}
          aria-label={t("audio.shuffle")}
        >
          <ShuffleIcon size={15} strokeWidth={1.75} aria-hidden />
        </button>
        <div className="mini-speed">
          <button
            className="mini-btn mini-speed__btn"
            onClick={() => setSpeedOpen((o) => !o)}
            aria-expanded={speedOpen}
            aria-label={t("audio.speed")}
          >
            {rate}×
          </button>
          {speedOpen && (
            <div className="mini-speed__menu" role="menu">
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <button
                  key={r}
                  role="menuitemradio"
                  aria-checked={rate === r}
                  className={`mini-speed__item ${rate === r ? "is-active" : ""}`}
                  onClick={() => { setRate(r); setSpeedOpen(false); }}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mini-volume">
          <button className="mini-btn" onClick={toggleMute} aria-label={t("focus.sounds.mute")} aria-pressed={muted}>
            {muted ? <MuteIcon size={15} strokeWidth={1.75} aria-hidden /> : <VolumeIcon size={15} strokeWidth={1.75} aria-hidden />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label={t("focus.sounds.master")}
          />
        </div>
      </div>

      {error && <div className="mini-player__error" role="alert">{t("audio.error")}</div>}
    </div>
  );
};

export default React.memo(MiniPlayer);
