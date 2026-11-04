/**
 * AudioEngine (AudioContext.jsx) — the GLOBAL audio engine for Bayan Space.
 *
 * Lives at the app root (outside routing) so playback survives route changes.
 * One single HTMLAudioElement owns music/quran/ambient — never two sources
 * at once (respectful, explicit separation between sections).
 *
 * Integrates with AudioLibraryProvider:
 *   - records a REAL listen when a track ends or is switched away
 *     (≥30s or ≥50% of duration — a bare play-tap never counts)
 *   - persists resume progress per track (Continue Listening)
 *
 * Media Session API: metadata + hardware/lock-screen controls on every
 * platform that exposes them (Windows/Android/iOS).
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAudioLibrary } from "./AudioLibraryProvider";
// React import retained for the JSX provider below.

/** Focus Space owns the visible player; every other route pauses + hides it. */
const FOCUS_ROUTE = "/focus";

const AudioEngineContext = createContext(null);
export const useAudio = () => useContext(AudioEngineContext);

const STORAGE_KEY = "bayanAudioPlayer";
const persistShape = {
  trackId: null,
  track: null, // full track snapshot so the last item can be restored by title
  positionSec: 0,
  volume: 0.9,
  muted: false,
  rate: 1,
  repeat: "off", // off | one | all
  shuffle: false,
  queueIds: [], // user-defined queue (list of track ids); empty = catalog order
};

/** sessionStorage — per-tab ephemeral playback state, never a cookie/persistence store. */
const readPersisted = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...persistShape, ...JSON.parse(raw) } : { ...persistShape };
  } catch {
    return { ...persistShape };
  }
};

export const AudioProvider = ({ children }) => {
  const lib = useAudioLibrary();
  const persisted = useRef(readPersisted());
  const audioRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(persisted.current.track);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [positionSec, setPositionSec] = useState(persisted.current.positionSec || 0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(persisted.current.volume);
  const [muted, setMutedState] = useState(persisted.current.muted);
  const [rate, setRateState] = useState(persisted.current.rate);
  const [repeat, setRepeatState] = useState(persisted.current.repeat);
  const [shuffle, setShuffleState] = useState(persisted.current.shuffle);
  const [queueIds, setQueueIds] = useState(persisted.current.queueIds || []);

  // position of the current track within the active queue
  const queue = useMemo(() => {
    // Catalog is resolved lazily to avoid a circular import; queue is
    // what's saved — falls back to [] which means "no navigation".
    return queueIds;
  }, [queueIds]);

  // --- single audio element lifecycle -------------------------------------
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoadedMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => {
      setPositionSec(audio.currentTime);
      // save progress (debounced by the provider)
      if (currentTrackRef.current) {
        try { lib?.saveProgress?.(currentTrackRef.current.id, audio.currentTime); } catch { /* ignore */ }
      }
    };
    const onPlaying = () => { setIsPlaying(true); setIsLoading(false); setError(null); };
    const onWaiting = () => setIsLoading(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => handleEndedRef.current();
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("LOAD_FAILED");
    };

    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      try { audio.pause(); audio.src = ""; } catch { /* ignore */ }
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;

  // volume / mute / rate reflect to the element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
    audioRef.current.playbackRate = rate;
  }, [volume, muted, rate]);

  // --- Media Session metadata ---------------------------------------------
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.author || currentTrack.reciter || "",
        album: currentTrack.source || "",
        artwork: currentTrack.thumbnail
          ? [{ src: currentTrack.thumbnail, sizes: "512x512", type: "image/png" }]
          : [],
      });
    } catch { /* unsupported */ }
  }, [currentTrack]);

  // --- playback control ----------------------------------------------------
  const loadTrack = useCallback((track, { autoplay = true, startAt = 0 } = {}) => {
    if (!track || !track.audioUrl) return;
    const audio = audioRef.current;
    setError(null);
    setIsLoading(autoplay);
    audio.src = track.audioUrl;
    audio.load();
    setCurrentTrack(track);
    setPositionSec(startAt);
    if (startAt > 0) {
      const seekOnMeta = () => {
        try { audio.currentTime = startAt; } catch { /* ignore */ }
        audio.removeEventListener("loadedmetadata", seekOnMeta);
      };
      audio.addEventListener("loadedmetadata", seekOnMeta);
    }
    if (autoplay) {
      audio.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
        setError("LOAD_FAILED");
      });
    }
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    // a track restored from sessionStorage may have no src yet on a fresh
    // mount — reattach it so Play resumes instead of failing silently
    if (!audio.src && currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      audio.load();
      const target = positionSecRef.current || 0;
      if (target > 0) {
        const onMeta = () => {
          try { audio.currentTime = Math.min(target, audio.duration || target); } catch { /* ignore */ }
          audio.removeEventListener("loadedmetadata", onMeta);
        };
        audio.addEventListener("loadedmetadata", onMeta);
      }
    }
    setIsLoading(true);
    audio.play().catch(() => { setIsLoading(false); setError("LOAD_FAILED"); });
  }, [currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  // --- listen accounting -----------------------------------------------------
  /** Fires when the track ENDS or a new one replaces it — real listens only. */
  const finalizeListen = useCallback(() => {
    const track = currentTrackRef.current;
    if (!track) return;
    // lib can be null if the provider is ever mounted without the library
    // context — never crash playback over bookkeeping.
    try { lib?.recordListen?.(track, positionSecRef.current, durationRef.current); } catch { /* ignore */ }
  }, [lib]);

  const positionSecRef = useRef(positionSec);
  positionSecRef.current = positionSec;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // step within the user queue
  const step = useCallback((dir) => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    if (idx === -1) return;
    let nextTrack;
    if (shuffle) {
      nextTrack = queue[Math.floor(Math.random() * queue.length)];
    } else {
      const nextIdx = (idx + dir + queue.length) % queue.length;
      nextTrack = queue[nextIdx];
    }
    finalizeListen();
    loadTrack(nextTrack, { autoplay: true });
  }, [currentTrack, queue, shuffle, loadTrack, finalizeListen]);

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => {
    if (positionSec > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPositionSec(0);
    } else {
      step(-1);
    }
  }, [positionSec, step]);

  const handleEndedRef = useRef(() => { });
  handleEndedRef.current = () => {
    finalizeListen();
    if (repeat === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setError("LOAD_FAILED"));
      }
      return;
    }
    const idx = queue.findIndex((t) => t.id === currentTrackRef.current?.id);
    const atEnd = idx === queue.length - 1;
    if (repeat === "all" || !atEnd) next();
    else setIsPlaying(false);
  };

  const seekTo = useCallback((sec) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(sec)) return;
    audio.currentTime = sec;
    setPositionSec(sec);
  }, []);

  const seekBy = useCallback((delta) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta)));
  }, [seekTo]);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (v > 0) setMutedState(false);
  }, []);

  const toggleMute = useCallback(() => setMutedState((m) => !m), []);
  const setRate = useCallback((r) => setRateState(r), []);
  const cycleRepeat = useCallback(() => {
    setRepeatState((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);
  const toggleShuffle = useCallback(() => setShuffleState((s) => !s), []);

  /** playTrack — primary entry used by the Hub and the SoundBoard.
   *  track: { id, title, author/reciter, audioUrl, ... }
   *  options.startAt: resume position (seconds) for Continue Listening. */
  const playTrack = useCallback((track, { startAt = 0, queue: newQueue } = {}) => {
    if (!track?.audioUrl) return; // never pretend to play
    finalizeListen();
    if (Array.isArray(newQueue) && newQueue.length) setQueueIds(newQueue);
    loadTrack(track, { autoplay: true, startAt });
  }, [loadTrack, finalizeListen]);

  // --- Media Session handlers ----------------------------------------------
  const mediaHandlers = useMemo(() => ({
    play, pause, next, prev: previous, seekBy, seekTo,
  }), [play, pause, next, previous, seekBy, seekTo]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const h = mediaHandlers;
    try {
      ms.setActionHandler("play", h.play);
      ms.setActionHandler("pause", h.pause);
      ms.setActionHandler("previoustrack", h.prev);
      ms.setActionHandler("nexttrack", h.next);
      ms.setActionHandler("seekbackward", (d) => h.seekBy(-(d?.seekOffset || 10)));
      ms.setActionHandler("seekforward", (d) => h.seekBy(d?.seekOffset || 10));
      ms.setActionHandler("seekto", (d) => h.seekTo(d.seekTime));
    } catch { /* some actions unsupported */ }
    return () => {
      try {
        ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"]
          .forEach((a) => ms.setActionHandler(a, null));
      } catch { /* ignore */ }
    };
  }, [mediaHandlers]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try { navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"; } catch { /* ignore */ }
  }, [isPlaying]);

  // Persist player state (sessionStorage — per-tab ephemeral playback state)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        trackId: currentTrack?.id || null,
        track: currentTrack,
        positionSec,
        volume, muted, rate, repeat, shuffle,
        queueIds,
        paused: !isPlaying,
      }));
    } catch { /* ignore */ }
  }, [currentTrack, positionSec, volume, muted, rate, repeat, shuffle, queueIds, isPlaying]);

  // ---- Focus Space navigation lifecycle -------------------------------------
  // Leaving /focus → pause once + snapshot the REAL element time. Nothing is
  // cleared: track, queue and source stay in memory + sessionStorage.
  // Returning /focus → restore track + position (metadata-accurate), paused.
  const location = useLocation();
  const inFocus = location.pathname === FOCUS_ROUTE || location.pathname.startsWith(FOCUS_ROUTE + "/");
  // start as "outside" so a page reload while ON /focus still triggers the
  // restore path (source reattach + position seek).
  const wasInFocusRef = useRef(false);
  const audioElRef = audioRef;

  useEffect(() => {
    const audio = audioElRef.current;
    const leavingFocus = wasInFocusRef.current && !inFocus;
    const enteringFocus = !wasInFocusRef.current && inFocus;
    wasInFocusRef.current = inFocus;

    if (leavingFocus) {
      if (audio && !audio.paused) {
        try { audio.pause(); } catch { /* ignore */ }
        setIsPlaying(false);
      }
      // snapshot the REAL currentTime from the element (not the debounced state)
      if (audio && audio.src && Number.isFinite(audio.currentTime)) {
        try {
          const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
          saved.positionSec = audio.currentTime;
          saved.paused = true;
          if (currentTrackRef.current) saved.track = currentTrackRef.current;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch { /* ignore */ }
      }
    }

    if (enteringFocus && audio) {
      const saved = readPersisted();
      const track = saved.track;
      if (!track?.audioUrl) return;
      const target = Math.max(0, saved.positionSec || 0);
      // restore track identity if the engine lost it (fresh mount)
      if (!currentTrackRef.current || currentTrackRef.current.id !== track.id) {
        setCurrentTrack(track);
        if (Array.isArray(saved.queueIds)) setQueueIds(saved.queueIds);
      }
      setPositionSec(target);
      setIsPlaying(false); // stay paused until the user presses Play
      // reload the same source only when the element lost/changed it
      if (!audio.src || audio.src !== track.audioUrl) {
        audio.src = track.audioUrl;
        audio.load();
        const onMeta = () => {
          try { audio.currentTime = Math.min(target, audio.duration || target); } catch { /* ignore */ }
          audio.removeEventListener("loadedmetadata", onMeta);
        };
        audio.addEventListener("loadedmetadata", onMeta);
      } else {
        // same source still loaded — seek in place (clamped to duration)
        try { audio.currentTime = Math.min(target, audio.duration || target); } catch { /* ignore */ }
      }
    }
  }, [inFocus]);

  const value = useMemo(() => ({
    // state
    currentTrack, isPlaying, isLoading, error,
    positionSec, duration, volume, muted, rate, repeat, shuffle,
    queue,
    // actions
    playTrack, play, pause, toggle, next, previous,
    seekTo, seekBy, setVolume, toggleMute, setRate, cycleRepeat, toggleShuffle,
  }), [
    currentTrack, isPlaying, isLoading, error,
    positionSec, duration, volume, muted, rate, repeat, shuffle, queue,
    playTrack, play, pause, toggle, next, previous,
    seekTo, seekBy, setVolume, toggleMute, setRate, cycleRepeat, toggleShuffle,
  ]);

  return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
};

export default AudioProvider;
