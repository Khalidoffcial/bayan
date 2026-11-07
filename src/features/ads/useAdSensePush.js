/**
 * useAdSensePush — the single safe-initialization routine shared by every
 * AdSense unit in the app (in-article + sidebar display).
 *
 * Guarantees:
 *  - push({}) runs EXACTLY ONCE per <ins> element: a per-instance ref guard
 *    plus a data attribute on the element survive React StrictMode's
 *    double-invoked effects and arbitrary re-renders.
 *  - Library missing (blocked / offline / slow) → silent no-op. No retry
 *    loop, no console noise, the host page keeps working normally.
 *  - A failed push never throws into React.
 *
 * @param {React.RefObject<HTMLElement>} ref  the <ins> element
 * @param {boolean} active  only push when the unit is actually eligible
 */
import { useEffect, useRef } from "react";

export function useAdSensePush(ref, active) {
    const pushedRef = useRef(false);

    useEffect(() => {
        if (!active) return;
        const ins = ref.current;
        if (!ins || pushedRef.current) return;          // StrictMode / re-render guard
        if (ins.dataset.adsenseInit === "1") return;    // same element already initialized
        if (typeof window === "undefined") return;
        // Library not present → stay silent forever (no retry loop).
        try {
            pushedRef.current = true;
            ins.dataset.adsenseInit = "1";
            // If the deferred loader hasn't injected the library yet, load it
            // now that a genuinely eligible unit is on screen — then push.
            if (!window.adsbygoogle && typeof window.__loadAdsense === "function") {
                window.__loadAdsense();
            }
            if (!window.adsbygoogle) return; // still loading — the script's own
            // onload flow initializes existing <ins> nodes; retry once it lands.
            const tryPush = (attempts) => {
                if (!window.adsbygoogle) {
                    if (attempts > 0) setTimeout(() => tryPush(attempts - 1), 400);
                    return;
                }
                try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
                catch { /* never break the host page */ }
            };
            tryPush(10);
        } catch {
            // Never let a failed ad push break the host page.
            pushedRef.current = false;
            delete ins.dataset.adsenseInit;
        }
    }, [active, ref]);

    return pushedRef;
}

export default useAdSensePush;
