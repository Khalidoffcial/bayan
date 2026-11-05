/**
 * useBookProgress — single hook for reading-progress persistence.
 *
 * Authenticated users → backend (PUT/GET /books/:provider/:id/progress),
 * which stores under the caller's own Firebase path (identity from the JWT;
 * a user can never touch another user's record).
 * Guests → localStorage, clearly labeled local-only (never "synced").
 *
 * Writes are debounced; page/chapter changes and leaving the reader flush
 * immediately. No progress is written when the book failed to load.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { getBookProgress, saveBookProgress, getGuestProgress, saveGuestProgress } from "../services/books.service";

const DEBOUNCE_MS = 1500;

export const useBookProgress = ({ provider, providerBookId, enabled = true }) => {
    const { user } = useAuth();
    const [initial, setInitial] = useState(null); // restored progress record
    const [restored, setRestored] = useState(false);
    const pendingRef = useRef(null);
    const timerRef = useRef(null);
    const loadedRef = useRef(false);

    /* ── restore ── */
    useEffect(() => {
        if (!provider || !providerBookId) return;
        let dead = false;
        setRestored(false);
        setInitial(null);
        (async () => {
            if (user?.id) {
                const r = await getBookProgress(provider, providerBookId);
                if (dead) return;
                if (r.ok && r.record) setInitial(r.record);
            } else {
                const local = getGuestProgress(provider, providerBookId);
                if (!dead && local) setInitial(local);
            }
            if (!dead) setRestored(true);
        })();
        return () => { dead = true; };
    }, [provider, providerBookId, user?.id]);

    const flush = useCallback(async () => {
        if (!pendingRef.current || !loadedRef.current) return;
        const payload = pendingRef.current;
        pendingRef.current = null;
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (user?.id) await saveBookProgress(provider, providerBookId, payload);
        else saveGuestProgress(provider, providerBookId, payload);
    }, [provider, providerBookId, user?.id]);

    /* ── record progress (debounced) ── */
    const reportProgress = useCallback((partial) => {
        if (!enabled || !provider || !providerBookId) return;
        loadedRef.current = true; // content actually loaded — safe to persist
        pendingRef.current = { ...(pendingRef.current || {}), ...partial };
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    }, [enabled, provider, providerBookId, flush]);

    // save whatever is pending when leaving the reader
    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (pendingRef.current && loadedRef.current) {
            const payload = pendingRef.current;
            pendingRef.current = null;
            if (user?.id) saveBookProgress(provider, providerBookId, payload);
            else saveGuestProgress(provider, providerBookId, payload);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider, providerBookId]);

    /* ── explicit user actions ── */
    const markCompleted = useCallback(async () => {
        pendingRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        loadedRef.current = true;
        const payload = { readingStatus: "completed", progressPercent: 100 };
        if (user?.id) return saveBookProgress(provider, providerBookId, payload);
        return saveGuestProgress(provider, providerBookId, payload);
    }, [provider, providerBookId, user?.id]);

    return { initialProgress: initial, restored, reportProgress, markCompleted, flush };
};

export default useBookProgress;
