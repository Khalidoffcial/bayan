/**
 * FeedStore — module-level singleton cache for the unified feed.
 *
 * Purpose: keep feed state (items, pagination cursor, scroll position)
 * alive across route navigations (Feed → Post → back to Feed) WITHOUT
 * refetching everything, while still honoring freshness:
 *
 * - STALE_MS (default 60s): within the window, a mounted Feed shows the
 *   cached page instantly and fetches nothing. After it expires, the next
 *   fetch is a SWR "refresh": ONE incremental page fetched from cursor 0
 *   of the server's ranked feed, dedup-merged on top of the cached items
 *   (new content surfaces; nothing re-downloads wholesale; pagination
 *   position of cached items is untouched).
 * - Per-type entries: "all", "posts", "articles", "novels" each keep their
 *   own items + cursor, so switching filters does not discard other tabs,
 *   and "all" does not re-request every source on each visit.
 * - In-flight dedup lives here too: a second identical request while one
 *   is pending shares the pending promise instead of hitting the server.
 *
 * Cache is invalidated precisely: content created (BAYAN_NEW_POST /
 * NEW_POST handling adds the item to matching entries), content deleted
 * (removeItem), or content updated in place (applyUpdate) — never a
 * blanket "clear everything on any change".
 */

const STALE_MS = 60_000; // fast-return freshness window (adjustable)

const state = {
  entries: new Map(), // type → { items, cursor, hasMore, fetchedAt, error }
  pending: new Map(), // requestKey → Promise (dedup of identical fetches)
  scroll: new Map(),  // type → scrollY
};

function getEntry(type) {
  if (!state.entries.has(type)) {
    state.entries.set(type, {
      items: [],
      cursor: 0,
      hasMore: true,
      fetchedAt: 0,
      error: null,
    });
  }
  return state.entries.get(type);
}

export const feedStore = {
  /** Snapshot for rendering — plain arrays, safe to spread into React state. */
  get(type) {
    const e = getEntry(type);
    return {
      items: e.items,
      cursor: e.cursor,
      hasMore: e.hasMore,
      fetchedAt: e.fetchedAt,
      error: e.error,
      isFresh: Date.now() - e.fetchedAt < STALE_MS,
      isEmpty: e.items.length === 0,
    };
  },

  /** Has this type ever been fetched? (fresh mount with warm cache) */
  has(type) {
    return state.entries.has(type) && state.entries.get(type).items.length >= 0 &&
      state.entries.get(type).fetchedAt > 0;
  },

  /** Merge a page result (from socket FEED_RESULT) into the entry. */
  mergePage(type, rawItems, { nextCursor, replace = false } = {}) {
    const e = getEntry(type);
    const seen = new Set(e.items.map((i) => String(i.id)));
    const fresh = [];
    for (const item of rawItems) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      fresh.push(item);
    }
    e.items = replace ? rawItems : [...e.items, ...fresh];
    if (nextCursor != null) e.cursor = nextCursor;
    e.fetchedAt = Date.now();
    e.error = null;
    return e.items;
  },

  /** Prepend a newly created item (local optimistic / socket NEW_POST). */
  prependItem(type, item) {
    if (!item?.id) return;
    const e = getEntry(type);
    if (e.items.some((i) => String(i.id) === String(item.id))) return;
    e.items = [item, ...e.items];
    e.fetchedAt = Date.now(); // creating content refreshes freshness too
  },

  /** Apply a partial update (likes/edit) to one item, in place. */
  applyUpdate(type, itemId, patch) {
    const e = getEntry(type);
    e.items = e.items.map((i) =>
      String(i.id) === String(itemId) ? { ...i, ...patch, userData: patch.userData ?? i.userData } : i
    );
  },

  /** Remove one item (deleted). Does NOT touch other entries' correctness —
   *  each entry filters its own copy. */
  removeItem(type, itemId) {
    const e = getEntry(type);
    e.items = e.items.filter((i) => String(i.id) !== String(itemId));
  },

  setError(type, error) {
    const e = getEntry(type);
    e.error = error;
    e.fetchedAt = Date.now(); // failed fetch still counts as an attempt
  },

  /** Scroll position persistence per feed type. */
  getScroll(type) {
    return state.scroll.get(type) ?? 0;
  },
  setScroll(type, y) {
    state.scroll.set(type, y);
  },

  /** Invalidate EVERYTHING (logout, account switch). */
  clearAll() {
    state.entries.clear();
    state.pending.clear();
  },

  STALE_MS,
};

/** Module-level in-flight dedup — identical requests share one promise. */
export function dedupRequest(key, producer) {
  if (state.pending.has(key)) return state.pending.get(key);
  let p;
  try {
    p = Promise.resolve(producer());
  } catch (err) {
    p = Promise.reject(err);
  }
  const tracked = p.finally(() => state.pending.delete(key));
  state.pending.set(key, tracked);
  return tracked;
}

export default feedStore;
