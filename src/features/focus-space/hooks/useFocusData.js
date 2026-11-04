/**
 * useFocusData — single source of truth for the focus space document.
 *
 * - Loads from the backend (server derives the user from the Bearer token —
 *   no client-supplied user id is trusted).
 * - Writes are optimistic + debounced (1s) to avoid burst writes; the
 *   server merges the patch, so parallel saves can't drop fields.
 * - Falls back to the localStorage cache when offline so the space still
 *   opens; a subtle `offline` flag lets the UI hint at limits.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFocusData,
  saveFocusData,
  readLocalCache,
  writeLocalCache,
} from "../services/focusSpace.service";
import { FOCUS_DEFAULTS } from "../constants/focusDefaults";

export const useFocusData = () => {
  const [data, setData] = useState(() => {
    const cached = readLocalCache();
    return cached ? { ...FOCUS_DEFAULTS, ...cached } : { ...FOCUS_DEFAULTS };
  });
  const [offline, setOffline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data: fresh } = await fetchFocusData();
      if (cancelled) return;
      setOffline(!ok);
      setData((prev) => ({ ...FOCUS_DEFAULTS, ...prev, ...fresh }));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    const patch = pendingRef.current;
    if (!Object.keys(patch).length) return;
    pendingRef.current = {};
    const { ok, data: merged } = await saveFocusData(patch);
    if (ok && merged) {
      setData((prev) => ({ ...prev, ...merged }));
    } else if (!ok) {
      setOffline(true);
    }
  }, []);

  /** Optimistic local update + debounced server save. */
  const update = useCallback(
    (patch) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        writeLocalCache(next);
        return next;
      });
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 1000);
    },
    [flush]
  );

  // Flush pending saves on unmount / tab close so nothing is lost.
  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [flush]);

  return { data, update, offline, loaded, dataRef };
};

export default useFocusData;
