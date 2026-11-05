/**
 * savedContent.service.js — Read Later data layer (reuses the EXISTING
 * per-user savedContent store: user_data/Profile/{uid}/savedContent).
 *
 * Endpoints (added in this feature, all identity from the JWT — never the
 * client-supplied user id):
 *   PUT /read-later                                toggle / add / update progress
 *   GET /read-later                                all saved items + read status
 *   GET /read-later/:contentType/:contentId        is this content saved?
 *   GET /focus-space/saved-content/:type/:id/full  full original content
 *                                                  (only if actually saved —
 *                                                  authorization server-side)
 */
import { api } from "../../../services/api.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

const READ_LATER = `${API_BASE_URL}/read-later`;

/** Tiny in-memory cache: one fetch per Focus Space entry, invalidated on
 *  any save/remove so a stale list is never shown after a mutation. */
let listCache = null;
const statusCache = new Map(); // `${type}:${id}` → { saved, record }

export const invalidateSavedCache = () => {
  listCache = null;
  statusCache.clear();
};

const normalizeType = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.startsWith("article")) return "articles";
  if (t.startsWith("novel")) return "novels";
  if (t === "books" || t === "book") return "books";
  return "posts";
};

/** Toggle: saved → removed, not saved → added. Returns { saved, ok, error }. */
export const toggleReadLater = async ({ contentId, contentType, title, image }) => {
  const type = normalizeType(contentType);
  try {
    const response = await api.put(READ_LATER, {
      contentId: String(contentId || ""),
      contentType: type,
      title: title ? String(title).slice(0, 300) : undefined,
      image: image ? String(image).slice(0, 1000) : undefined,
    });
    const body = response?.data;
    if (body?.status !== "ok") return { ok: false, error: body?.message || "FAILED" };
    invalidateSavedCache();
    return { ok: true, saved: Boolean(body.saved) };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

/** Update read progress / status. progress 0..100, status in the 3 states. */
export const updateReadProgress = async ({ contentId, contentType, readProgressPercent, readStatus }) => {
  const type = normalizeType(contentType);
  try {
    const response = await api.put(READ_LATER, {
      contentId: String(contentId || ""),
      contentType: type,
      ...(readProgressPercent !== undefined ? { readProgressPercent: Math.max(0, Math.min(100, Math.round(readProgressPercent))) } : {}),
      ...(readStatus !== undefined ? { readStatus } : {}),
    });
    const body = response?.data;
    if (body?.status !== "ok") return { ok: false, error: body?.message || "FAILED" };
    invalidateSavedCache();
    return { ok: true, record: body.record };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

/** Is a single item saved (and its record)? Cached per content key. */
export const getSavedStatus = async ({ contentId, contentType }) => {
  const type = normalizeType(contentType);
  const key = `${type}:${contentId}`;
  if (statusCache.has(key)) return statusCache.get(key);
  try {
    const response = await api.get(`${READ_LATER}/${type}/${encodeURIComponent(String(contentId))}`);
    const body = response?.data;
    const result = { ok: body?.status === "ok", saved: Boolean(body?.saved), record: body?.record || null };
    statusCache.set(key, result);
    return result;
  } catch (err) {
    return { ok: false, saved: false, record: null, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

/** The user's full saved list (metadata only — one request per entry into
 *  Focus Space, not per render). */
export const fetchReadLaterList = async () => {
  if (listCache) return { ok: true, items: listCache };
  try {
    const response = await api.get(READ_LATER);
    const body = response?.data;
    const items = Array.isArray(body?.items) ? body.items : [];
    listCache = items;
    return { ok: true, items };
  } catch (err) {
    return { ok: false, items: [], error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

/** Full ORIGINAL content of a saved item — for reading inside Focus Space.
 *  Server refuses unless the item is in THIS user's list. */
export const fetchSavedContentFull = async ({ contentId, contentType }) => {
  const type = normalizeType(contentType);
  try {
    const response = await api.get(
      `${API_BASE_URL}/focus-space/saved-content/${type}/${encodeURIComponent(String(contentId))}/full`
    );
    const body = response?.data;
    if (body?.status !== "ok" || !body?.content) return { ok: false, error: body?.message || "NOT_FOUND" };
    return { ok: true, content: body.content };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export default {
  toggleReadLater,
  updateReadProgress,
  getSavedStatus,
  fetchReadLaterList,
  fetchSavedContentFull,
  invalidateSavedCache,
};
