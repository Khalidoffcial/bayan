/**
 * useSoundPlayer — multi-layer ambient sound mixer.
 *
 * Behaviours (per spec):
 *  - Loading / error / retry states per sound, surfaced in the board.
 *  - Nothing autoplays: playback starts ONLY from an explicit user action.
 *  - Starting one sound never plays a second instance of the same id
 *    (one <audio> per id, toggled).
 *  - The Quran player is a SEPARATE hook (useQuranPlayer) — never mixed.
 *  - All elements are paused on unmount (leaving the space stops audio).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { SOUND_CATALOG, getSoundById } from "../constants/focusSounds";

const STATE = {
  idle: "idle",
  loading: "loading",
  playing: "playing",
  error: "error",
};

export const useSoundPlayer = () => {
  // { [soundId]: volume } for currently active sounds
  const [active, setActive] = useState({});
  const [masterVolume, setMasterVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState({});
  const audioRef = useRef(new Map());

  // Pause & clean everything on unmount (leaving focus space kills audio).
  useEffect(() => () => {
    audioRef.current.forEach((a) => {
      try { a.pause(); a.src = ""; } catch { /* ignore */ }
    });
    audioRef.current.clear();
  }, []);

  useEffect(() => {
    audioRef.current.forEach((audio) => {
      audio.volume = muted ? 0 : Math.min(1, masterVolume * Number(audio.dataset.vol || 1));
    });
  }, [masterVolume, muted, active, loading, errors]);

  const startSound = useCallback((soundId) => {
    const sound = getSoundById(soundId);
    if (!sound) return;
    // Prevent double-instance: if an audio element already exists for this
    // id (even mid-load), reuse it instead of creating a second one.
    let audio = audioRef.current.get(soundId);
    if (!audio) {
      if (!sound.src) {
        // No source at all (needs local file) — explicit error, no fake play.
        setErrors((prev) => ({ ...prev, [soundId]: "NO_SOURCE" }));
        return;
      }
      audio = new Audio(sound.src);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.dataset.vol = sound.defaultVolume;
      audio.addEventListener("error", () => {
        setErrors((prev) => ({ ...prev, [soundId]: "LOAD_FAILED" }));
        setLoading((prev) => ({ ...prev, [soundId]: false }));
        stopSoundRef.current(soundId);
      });
      audio.addEventListener("playing", () => {
        setErrors((prev) => { const n = { ...prev }; delete n[soundId]; return n; });
        setLoading((prev) => ({ ...prev, [soundId]: false }));
      });
      audio.addEventListener("waiting", () => setLoading((prev) => ({ ...prev, [soundId]: true })));
      audioRef.current.set(soundId, audio);
    }
    audio.volume = muted ? 0 : masterVolume * sound.defaultVolume;
    setLoading((prev) => ({ ...prev, [soundId]: true }));
    audio.play().catch((err) => {
      const reason = err?.name === "NotAllowedError" ? "BLOCKED" : "LOAD_FAILED";
      setErrors((prev) => ({ ...prev, [soundId]: reason }));
      setLoading((prev) => ({ ...prev, [soundId]: false }));
    });
    setActive((prev) => ({ ...prev, [soundId]: sound.defaultVolume }));
  }, [masterVolume, muted]);

  const stopSound = useCallback((soundId) => {
    const audio = audioRef.current.get(soundId);
    if (audio) {
      try { audio.pause(); audio.src = ""; } catch { /* ignore */ }
      audioRef.current.delete(soundId);
    }
    setLoading((prev) => { const n = { ...prev }; delete n[soundId]; return n; });
    setActive((prev) => {
      const next = { ...prev };
      delete next[soundId];
      return next;
    });
  }, []);

  // Stable ref for use inside the error listener above.
  const stopSoundRef = useRef(stopSound);
  stopSoundRef.current = stopSound;

  const retrySound = useCallback((soundId) => {
    setErrors((prev) => { const n = { ...prev }; delete n[soundId]; return n; });
    stopSoundRef.current(soundId);
    startSound(soundId);
  }, [startSound]);

  const toggleSound = useCallback((soundId) => {
    if (audioRef.current.has(soundId)) stopSound(soundId);
    else startSound(soundId);
  }, [startSound, stopSound]);

  const setSoundVolume = useCallback((soundId, volume) => {
    const audio = audioRef.current.get(soundId);
    if (audio) audio.dataset.vol = volume;
    setActive((prev) => ({ ...prev, [soundId]: volume }));
  }, []);

  const stopAll = useCallback(() => {
    audioRef.current.forEach((a) => {
      try { a.pause(); a.src = ""; } catch { /* ignore */ }
    });
    audioRef.current.clear();
    setLoading({});
    setActive({});
  }, []);

  return {
    STATE,
    active,
    errors,
    loading,
    masterVolume,
    muted,
    setMasterVolume,
    setMuted,
    startSound,
    stopSound,
    retrySound,
    toggleSound,
    setSoundVolume,
    stopAll,
  };
};

export default useSoundPlayer;
