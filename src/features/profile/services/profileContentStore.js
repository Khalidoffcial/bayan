import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

/**
 * ProfileContentStore — persistent cache for profile content feeds.
 * Keeps items + pagination cursor + per-tab state alive while the user
 * navigates from a profile into a post/article/novel and back, and across
 * different profile visits (each owner id gets its own entry).
 *
 * Freshness: PROFILE_STALE_MS window — inside it, a mounted profile renders
 * instantly from cache with ZERO requests; afterwards the next visit does a
 * SWR-style refresh (single page re-fetch merged/deduped on top).
 *
 * Surgical updates: created content prepends (owner-verified at the hook),
 * deleted content removes by id, LIKE patches in place — never a blanket
 * invalidation. No Firebase writes happen here; this is view-layer only.
 */

export const PROFILE_STALE_MS = 60_000;

const state = {
  entries: new Map(), // key `${userId}:${tab}` → { items, cursor, hasMore, fetchedAt, counts, error }
  scroll: new Map(),  // key → scrollY
};

const entryKey = (userId, tab) => `${String(userId)}:${String(tab || "all")}`;

function getEntry(userId, tab) {
  const key = entryKey(userId, tab);
  if (!state.entries.has(key)) {
    state.entries.set(key, {
      items: [],
      cursor: 0,
      hasMore: false,
      counts: {},
      fetchedAt: 0,
      error: null,
    });
  }
  return state.entries.get(key);
}

export const profileContentStore = {
  get(userId, tab) {
    const e = getEntry(userId, tab);
    return {
      items: e.items,
      cursor: e.cursor,
      hasMore: e.hasMore,
      counts: e.counts,
      error: e.error,
      fetchedAt: e.fetchedAt,
      isFresh: Date.now() - e.fetchedAt < PROFILE_STALE_MS,
      isEmpty: e.items.length === 0,
      everFetched: e.fetchedAt > 0,
    };
  },

  /** Replace-or-merge a page result; dedups by id; keeps newest-first order. */
  mergePage(userId, tab, rawItems, { nextCursor, replace = false, counts } = {}) {
    const e = getEntry(userId, tab);
    const seen = new Set(e.items.map((i) => String(i.id)));
    const fresh = [];
    for (const item of rawItems) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      fresh.push(item);
    }
    e.items = replace ? rawItems : [...e.items, ...fresh];
    if (replace) {
      // ensure the replaced page is sorted chronologically
      e.items = [...e.items].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    if (nextCursor != null) e.cursor = nextCursor;
    if (counts) e.counts = counts;
    e.fetchedAt = Date.now();
    e.error = null;
    return e.items;
  },

  /** Prepend newly created content authored by this profile owner. */
  prependItem(userId, tab, item) {
    if (!item?.id) return;
    const e = getEntry(userId, tab);
    if (e.items.some((i) => String(i.id) === String(item.id))) return;
    e.items = [item, ...e.items];
    e.fetchedAt = Date.now();
  },

  applyUpdate(userId, tab, itemId, patch) {
    const e = getEntry(userId, tab);
    e.items = e.items.map((i) =>
      String(i.id) === String(itemId) ? { ...i, ...patch, userData: patch.userData ?? i.userData } : i
    );
  },

  removeItem(userId, tab, itemId) {
    const e = getEntry(userId, tab);
    e.items = e.items.filter((i) => String(i.id) !== String(itemId));
  },

  setError(userId, tab, error) {
    const e = getEntry(userId, tab);
    e.error = error;
  },

  getScroll(userId, tab) {
    return state.scroll.get(entryKey(userId, tab)) ?? 0;
  },
  setScroll(userId, tab, y) {
    state.scroll.set(entryKey(userId, tab), y);
  },

  /** Account switch / logout safety. */
  clearAll() {
    state.entries.clear();
    state.scroll.clear();
  },

  PROFILE_STALE_MS,
};

export default profileContentStore;
