/**
 * Focus Space service — data layer between the UI and the backend.
 *
 * All requests go through `api` (axios) which attaches the Bearer token,
 * so the user id is NEVER trusted from the client — the server derives it
 * from the verified JWT (mainServer.js → verifyToken → req.user.id).
 *
 * Endpoints (added to the backend in this feature):
 *   GET  /focus-space                 → { notes, tasks, sessions, notifications, customBackgrounds, settings }
 *   PUT  /focus-space                 → merged partial write (server-side whitelist + limits)
 *   GET  /focus-space/saved-content   → real saved items read from user_data/Profile/{uid}/savedContent
 */
import { api } from "../../../services/api.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

const FOCUS_ENDPOINT = `${API_BASE_URL}/focus-space`;

/** Local cache mirror — offline-friendly first paint before the server answers. */
const CACHE_KEY = "focusSpaceCache";

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
    /* storage full / unavailable — cache is best-effort only */
  }
};

export const clearLocalCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Loads the whole focus space document for the current user.
 * Returns `{ data, ok }` so callers can distinguish network errors.
 */
export const fetchFocusData = async () => {
  try {
    const response = await api.get(FOCUS_ENDPOINT);
    const data = response?.data ?? {};
    writeLocalCache(data);
    return { ok: true, data };
  } catch (error) {
    // Offline / network failure → serve last known state so the space
    // still opens, but flag it so the UI can show a subtle banner.
    const cached = readLocalCache();
    return { ok: false, data: cached ?? {}, error: describeError(error) };
  }
};

/**
 * Persists a PARTIAL patch. The server merges it over the existing record
 * after whitelisting and validating every field, so nothing unknown is saved.
 */
export const saveFocusData = async (patch) => {
  try {
    const response = await api.put(FOCUS_ENDPOINT, patch);
    if (response?.data?.status === "ok") {
      writeLocalCache(response.data.data);
      return { ok: true, data: response.data.data };
    }
    return { ok: false, error: "UNKNOWN" };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
};

/** Real saved content (articles / novels / posts) the user bookmarked elsewhere in Bayan. */
export const fetchSavedContent = async () => {
  try {
    const response = await api.get(`${FOCUS_ENDPOINT}/saved-content`);
    const items = Array.isArray(response?.data?.items) ? response.data.items : [];
    return { ok: true, items };
  } catch (error) {
    return { ok: false, items: [], error: describeError(error) };
  }
};

function describeError(error) {
  return error?.response?.data?.error || error?.message || "NETWORK";
}
