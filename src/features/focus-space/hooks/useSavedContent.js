/**
 * useSavedContent — loads the user's REAL read-later items from the backend
 * (`/read-later` metadata) enriched with display data from the existing
 * `/focus-space/saved-content` endpoint (titles, covers).
 * One fetch on mount (not per render); `reload()` is called after every
 * save/remove mutation so the cache never goes stale.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchSavedContent, fetchReadLaterList } from "../services/focusSpace.service";
import { fetchReadLaterList as fetchReadLaterMeta, invalidateSavedCache } from "../services/savedContent.service";

export const useSavedContent = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    invalidateSavedCache();
    // metadata (progress/status) + display data (title/cover) — parallel
    const [meta, display] = await Promise.all([fetchReadLaterMeta(), fetchSavedContent()]);
    if (!meta.ok && !display.ok) {
      setError(meta.error || display.error || "NETWORK");
      setItems([]);
      setLoading(false);
      return;
    }
    const byKey = new Map();
    for (const it of display.items || []) byKey.set(`${it.type}:${it.id}`, it);
    let list;
    if (meta.ok) {
      list = (meta.items || []).map((m) => {
        const d = byKey.get(`${m.contentType === "article" ? "articles" : m.contentType === "novel" ? "novels" : "posts"}:${m.contentId}`) || {};
        return {
          ...d,
          contentId: m.contentId,
          contentType: m.contentType,
          savedAt: m.savedAt || d.savedAt,
          readStatus: m.readStatus,
          readProgressPercent: m.readProgressPercent,
          lastReadAt: m.lastReadAt,
        };
      });
    } else {
      // metadata endpoint failed — degrade to display-only data
      list = (display.items || []).map((d) => ({
        ...d,
        contentId: d.id,
        contentType: d.type,
        readStatus: d.readStatus || "not_started",
        readProgressPercent: 0,
      }));
    }
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter((i) => i.readStatus === "not_started").length;

  return { items, loading, error, reload: load, unreadCount };
};

export default useSavedContent;
