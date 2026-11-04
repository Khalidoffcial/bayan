/**
 * useSavedContent — loads the user's REAL saved items from the backend
 * (`/focus-space/saved-content` → user_data/Profile/{uid}/savedContent).
 * No demo data — when the user has nothing saved the panel says so.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchSavedContent } from "../services/focusSpace.service";

export const useSavedContent = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, items: fresh, error: err } = await fetchSavedContent();
    if (ok) setItems(fresh);
    else setError(err || "NETWORK");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter((i) => !i.read).length;

  return { items, loading, error, reload: load, unreadCount };
};

export default useSavedContent;
