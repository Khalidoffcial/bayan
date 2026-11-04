/**
 * FocusSoundBoard — ambient sound mixer (Audio Hub integrated).
 *
 * - Master volume + mute on top.
 * - All tracks route through the GLOBAL AudioEngine (AudioContext) via
 *   useAudio() — the same engine powers the MiniPlayer and the Discovery
 *   Hub, so switching sections never plays two sources at once.
 * - The Quran section opens the same single-slot engine (never mixed).
 */
import React, { useCallback } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { AMBIENT_CATALOG } from "../../audio/constants/audioCatalog";
import { useAudio } from "../../audio/AudioContext";
import { MuteIcon as MuteGlyphIcon } from "../constants/focusIcons";
import { QuranSection } from "./QuranSection";
import { FocusMusicDiscovery } from "./FocusMusicDiscovery";
import "../styles/focus-space.css";

export const FocusSoundBoard = () => {
  const { t } = useTranslation();
  const { playTrack, currentTrack, isPlaying, toggle } = useAudio();

  const handlePlay = useCallback((track) => {
    if (currentTrack?.id === track.id) {
      toggle(); // same slot — play/pause
    } else {
      playTrack(track);
    }
  }, [currentTrack, playTrack, toggle]);

  return (
    <div className="fc-sounds">
      {/* ── Music Discovery: real search (iTunes metadata + CC playback) ── */}
      <div className="fc-sounds__group">
        <div className="fc-sounds__group-title">{t("focus.music.discovery")}</div>
        <FocusMusicDiscovery />
      </div>

      {/* ── Ambient Sounds (kept) ── */}
      <div className="fc-sounds__group">
        <div className="fc-sounds__group-title">{t("focus.sounds.cat.ambient")}</div>
        <div className="fc-sounds__grid">
          {AMBIENT_CATALOG.map((sound) => {
            const isActive = currentTrack?.id === sound.id && isPlaying;
            return (
              <button
                key={sound.id}
                className={`fc-sound ${isActive ? "is-active" : ""}`}
                onClick={() => handlePlay(sound)}
                aria-pressed={isActive}
                title={t(`focus.sounds.${sound.id.replace("amb:", "")}`) || sound.title}
              >
                <span className="fc-sound__name">{sound.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quran (kept, strictly separated) ── */}
      <QuranSection />
    </div>
  );
};

export default React.memo(FocusSoundBoard);
