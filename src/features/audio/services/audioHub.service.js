/**
 * Audio Hub service — data layer between the UI and the backend
 * for the music & Quran discovery system.
 *
 * All requests go through `api` (axios) which attaches the Bearer token;
 * the server derives the user id from the verified JWT — the client never
 * sends a user id it claims.
 *
 * Endpoints (backend, mainServer.js):
 *   GET  /audio-hub/search?q=..&page=..   → Openverse CC-music search (cached server-side)
 *   GET  /audio-hub/search-music?source=itunes|openverse  → real song/artist/album search
 *   GET  /audio-hub/library               → { favorites, playlists, history }
 *   PUT  /audio-hub/library               → partial write (server whitelists + validates)
 *   GET  /audio-hub/trending              → global most-played (real listens only)
 */
import { api } from "../../../services/api.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

const HUB_ENDPOINT = `${API_BASE_URL}/audio-hub`;

/** Local cache mirror — offline-friendly first paint. */
const CACHE_KEY = "audioHubLibraryCache";

export const readLocalCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeLocalCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full — best effort */
  }
};

/** Client-side search-result cache (short TTL) to cut repeat requests. */
const SEARCH_TTL_MS = 60_000;
const searchCache = new Map(); // key → { at, items }

export const searchAudio = async (query, { page = 1, limit = 20, source = "itunes" } = {}) => {
  const q = (query || "").trim().slice(0, 120);
  if (!q) return { ok: true, items: [], cached: false, rateLimited: false };

  const key = `${source}:${q.toLowerCase()}:${page}:${limit}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) {
    return { ok: true, items: hit.items, cached: true, rateLimited: false, provider: source };
  }

  try {
    const endpoint = source === "openverse" ? "/search" : "/search-music";
    const response = await api.get(HUB_ENDPOINT + endpoint, {
      params: source === "openverse"
        ? { q, page, limit }
        : { q, page, limit, source: "itunes" },
    });
    const items = Array.isArray(response?.data?.items) ? response.data.items : [];
    searchCache.set(key, { at: Date.now(), items });
    if (searchCache.size > 80) {
      // keep the map bounded — drop the oldest entries
      const oldest = [...searchCache.entries()]
        .sort((a, b) => a[1].at - b[1].at)
        .slice(0, 20);
      oldest.forEach(([k]) => searchCache.delete(k));
    }
    return {
      ok: true,
      items,
      cached: Boolean(response?.data?.cached),
      rateLimited: Boolean(response?.data?.rateLimited),
    };
  } catch (error) {
    // stale cache is better than nothing on a network hiccup
    if (hit) return { ok: true, items: hit.items, cached: true, stale: true };
    return {
      ok: false,
      items: [],
      error: error?.response?.data?.error || error?.message || "NETWORK",
    };
  }
};

export const fetchLibrary = async () => {
  try {
    const response = await api.get(`${HUB_ENDPOINT}/library`);
    const data = response?.data ?? {};
    const library = {
      favorites: data.favorites || [],
      playlists: data.playlists || [],
      history: data.history || [],
    };
    writeLocalCache(library);
    return { ok: true, ...library };
  } catch (error) {
    const cached = readLocalCache();
    return {
      ok: false,
      favorites: cached?.favorites || [],
      playlists: cached?.playlists || [],
      history: cached?.history || [],
      error: error?.response?.data?.error || error?.message || "NETWORK",
    };
  }
};

/**
 * saveLibrary — partial write. The server whitelists every field and
 * validates shapes, so an invalid payload is dropped server-side.
 * `progress` keys are track ids, values are positionSec (resume listening).
 */
export const saveLibrary = async ({ favorites, playlists, history, progress }) => {
  const patch = {};
  if (favorites !== undefined) patch.favorites = favorites;
  if (playlists !== undefined) patch.playlists = playlists;
  if (history !== undefined) patch.history = history;
  if (progress !== undefined) patch.progress = progress;
  if (!Object.keys(patch).length) return { ok: true };

  try {
    const response = await api.put(`${HUB_ENDPOINT}/library`, patch);
    if (response?.data?.status === "ok") {
      const data = response.data.data || {};
      const merged = {
        favorites: data.favorites || [],
        playlists: data.playlists || [],
        history: data.history || [],
      };
      writeLocalCache(merged);
      return { ok: true, ...merged };
    }
    return { ok: false, error: "UNKNOWN" };
  } catch (error) {
    return { ok: false, error: error?.response?.data?.error || error?.message || "NETWORK" };
  }
};

/** Global most-played — real listens only (server enforces ≥30s rule). */
export const fetchTrending = async () => {
  try {
    const response = await api.get(`${HUB_ENDPOINT}/trending`);
    return { ok: true, items: Array.isArray(response?.data?.items) ? response.data.items : [] };
  } catch (error) {
    return { ok: false, items: [], error: error?.response?.data?.error || error?.message || "NETWORK" };
  }
};
