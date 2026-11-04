/**
 * AudioLibraryProvider — user audio state for the Audio Hub.
 *
 * Holds: favorites, playlists, listen history, per-track resume progress.
 * All writes are optimistic + debounced to the backend (audioHub.service),
 * with a localStorage mirror for offline. Backend derives the user from
 * the JWT — no client-supplied ids.
 *
 * Real-listen rule (mirrors the server's sanitizeListenEvent):
 * a "listen" counts when playedSec ≥ 30s OR ≥50% of the track duration
 * (whichever is smaller). A bare play-tap never counts by itself.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchLibrary, saveLibrary, fetchTrending } from "./services/audioHub.service";

const AudioLibraryContext = createContext(null);
export const useAudioLibrary = () => useContext(AudioLibraryContext);

const isListened = (playedSec, durationSec) => {
  const played = Number(playedSec) || 0;
  const duration = Number(durationSec) || 0;
  const threshold = duration > 0 ? Math.min(30, duration * 0.5) : 30;
  return played >= threshold;
};

export const AudioLibraryProvider = ({ children }) => {
  const [loaded, setLoaded] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [trending, setTrending] = useState([]);
  const progressRef = useRef({}); // trackId → positionSec
  const pendingRef = useRef({});
  const saveTimerRef = useRef(null);
  const historyBufferRef = useRef([]);

  // ---- initial load ------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await fetchLibrary();
      if (cancelled) return;
      setFavorites(lib.favorites || []);
      setPlaylists(lib.playlists || []);
      setHistory(lib.history || []);
      setLoaded(true);
      const trend = await fetchTrending();
      if (!cancelled && trend.ok) setTrending(trend.items);
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- debounced flush ---------------------------------------------------
  const flush = useCallback(async () => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (!Object.keys(patch).length) return;
    await saveLibrary(patch);
  }, []);

  const scheduleSave = useCallback((patch) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flush, 1200);
  }, [flush]);

  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [flush]);

  // ---- favorites ---------------------------------------------------------
  const isFavorite = useCallback(
    (trackId) => favorites.some((t) => t.id === trackId),
    [favorites]
  );

  const toggleFavorite = useCallback((track) => {
    setFavorites((prev) => {
      const next = prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [{ ...track, addedAt: new Date().toISOString() }, ...prev];
      scheduleSave({ favorites: next });
      return next;
    });
  }, [scheduleSave]);

  // ---- playlists ---------------------------------------------------------
  const createPlaylist = useCallback((name) => {
    const pl = { id: `pl_${Date.now()}`, name: String(name || "").slice(0, 120), tracks: [], createdAt: new Date().toISOString() };
    setPlaylists((prev) => {
      const next = [...prev, pl];
      scheduleSave({ playlists: next });
      return next;
    });
    return pl;
  }, [scheduleSave]);

  const deletePlaylist = useCallback((plId) => {
    setPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== plId);
      scheduleSave({ playlists: next });
      return next;
    });
  }, [scheduleSave]);

  const addToPlaylist = useCallback((plId, track) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== plId) return p;
        if ((p.tracks || []).some((t) => t.id === track.id)) return p; // no dupes
        return { ...p, tracks: [...(p.tracks || []), { ...track, addedAt: new Date().toISOString() }] };
      });
      scheduleSave({ playlists: next });
      return next;
    });
  }, [scheduleSave]);

  const removeFromPlaylist = useCallback((plId, trackId) => {
    setPlaylists((prev) => {
      const next = prev.map((p) =>
        p.id === plId ? { ...p, tracks: (p.tracks || []).filter((t) => t.id !== trackId) } : p
      );
      scheduleSave({ playlists: next });
      return next;
    });
  }, [scheduleSave]);

  // ---- history (real listens) ---------------------------------------------
  /** Called by the audio engine when a track ENDS or is switched away. */
  const recordListen = useCallback((track, playedSec, durationSec) => {
    if (!track) return;
    const listened = isListened(playedSec, durationSec);
    const entry = {
      track,
      playedSec: Math.round((Number(playedSec) || 0) * 10) / 10,
      durationSec: Number(durationSec) || 0,
      listened,
      at: new Date().toISOString(),
    };
    // optimistic local update — replace previous entry of the same track
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.track?.id !== track.id)].slice(0, 200);
      historyBufferRef.current = next;
      scheduleSave({ history: next });
      return next;
    });
  }, [scheduleSave]);

  // ---- resume progress -----------------------------------------------------
  const saveProgress = useCallback((trackId, positionSec) => {
    if (!trackId || !Number.isFinite(positionSec)) return;
    progressRef.current = { ...progressRef.current, [trackId]: Math.round(positionSec * 10) / 10 };
    scheduleSave({ progress: progressRef.current });
  }, [scheduleSave]);

  const getProgress = useCallback((trackId) => progressRef.current[trackId] || 0, []);

  // ---- derived: personal most-played & recommendations ----------------------
  const mostPlayedByMe = useMemo(() => {
    const counts = new Map();
    for (const h of history) {
      if (!h?.listened || !h?.track?.id) continue;
      counts.set(h.track.id, (counts.get(h.track.id) || 0) + 1);
    }
    const byId = new Map();
    for (const h of history) {
      if (h?.track && !byId.has(h.track.id)) byId.set(h.track.id, h.track);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => byId.get(id))
      .filter(Boolean)
      .slice(0, 20);
  }, [history]);

  const recentlyPlayed = useMemo(
    () => history.slice(0, 20).map((h) => h.track).filter(Boolean),
    [history]
  );

  /**
   * Recommended for me — from MY OWN real listens: the most-played sections,
   * topped up with global trending. No fake data; empty when no signals.
   */
  const recommended = useMemo(() => {
    const seen = new Set(recentlyPlayed.map((t) => t.id));
    const bySection = {};
    for (const h of history) {
      if (!h?.listened || !h?.track?.section) continue;
      bySection[h.track.section] = (bySection[h.track.section] || 0) + 1;
    }
    const topSections = Object.entries(bySection)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);
    const picks = [];
    for (const s of topSections) {
      for (const t of trending) {
        if (t.section === s && !seen.has(t.id) && !picks.some((p) => p.id === t.id)) {
          picks.push(t);
          if (picks.length >= 12) return picks;
        }
      }
    }
    for (const t of trending) {
      if (!seen.has(t.id) && !picks.some((p) => p.id === t.id)) {
        picks.push(t);
        if (picks.length >= 12) return picks;
      }
    }
    return picks;
  }, [history, trending, recentlyPlayed]);

  const continueListening = useMemo(
    () =>
      history
        .filter((h) => h?.track && h.durationSec > 0 && h.playedSec > 20 && h.playedSec < h.durationSec * 0.95)
        .slice(0, 10)
        .map((h) => ({ track: h.track, positionSec: h.playedSec, durationSec: h.durationSec })),
    [history]
  );

  const value = useMemo(() => ({
    loaded,
    favorites, playlists, history, trending,
    isFavorite, toggleFavorite,
    createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    recordListen, saveProgress, getProgress,
    mostPlayedByMe, recentlyPlayed, recommended, continueListening,
  }), [
    loaded, favorites, playlists, history, trending,
    isFavorite, toggleFavorite,
    createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    recordListen, saveProgress, getProgress,
    mostPlayedByMe, recentlyPlayed, recommended, continueListening,
  ]);

  return <AudioLibraryContext.Provider value={value}>{children}</AudioLibraryContext.Provider>;
};
