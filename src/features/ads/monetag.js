/**
 * monetag.js — single-flight Monetag script loader.
 *
 * The zone script is injected ONCE per app lifetime — and while the only
 * supplied zone is a vignette (prohibited format), nothing is injected at all. React route changes
 * never re-download it; zones are rendered/destroyed by the AdSlot component
 * through Monetag's window.zd Hurricane API if present, or simply by keeping
 * the reserved container mounted/unmounted.
 *
 * No user data is passed to Monetag. Nothing runs when no zone ids exist.
 */

import { adsEnabled } from "./adsConfig";

let loadPromise = null;

/**
 * The ONLY script text this project ever injects is the one verbatim
 * copy-pasted from the publisher's Monetag account. We never invent a zone id,
 * sdk id, or URL. Today the supplied zone is a vignette (prohibited format),
 * so injectMonetag() stays dormant until a banner zone is configured.
 */
export function isMonetagScriptAllowed() {
    return adsEnabled(); // false while the configured format is vignette/prohibited
}

/**
 * Reserved: when the publisher adds a banner (in-page) zone, the exact
 * publisher snippet is pasted into loadMonetag() as-is — never generated.
 */
export const PENDING_PUBLISHER_SNIPPET = true;

/** does this browser have consent context we can rely on? (consent gate) */
function consentAllows() {
    try {
        // If the app has a consent manager later, hook it here. Until then we
        // respect a local signal so we never run ads before it's granted.
        return localStorage.getItem("bayanAdsConsent") !== "denied";
    } catch {
        return true;
    }
}

/** inject the Monetag library exactly once; resolves when ready or fails soft */
export function loadMonetag() {
    if (!loadPromise) {
        loadPromise = new Promise((resolve) => {
            if (!isMonetagScriptAllowed()) { resolve(false); return; }
            if (window.__bayanMonetagReady) { resolve(true); return; }
            if (document.querySelector("script[data-bayan-monetag]")) { resolve(true); return; }
            /* nothing is injected while the only supplied format (vignette)
               is prohibited — see adsConfig. When a banner zone id is set,
               the exact publisher snippet for that format is used here. */
            resolve(false);
            return;
        /*
        const s = document.createElement("script");
        s.dataset.zone = "<ZONE_ID_FROM_PUBLISHER_SNIPPET>";
        s.src = "<EXACT_SRC_FROM_PUBLISHER_SNIPPET>";
        s.setAttribute("data-bayan-monetag", "1");
        s.async = true;
        s.onerror = () => { loadPromise = null; resolve(false); };
        s.onload = () => { window.__bayanMonetagReady = true; resolve(true); };
        document.head.appendChild(s);
        */
        });
    }
    return loadPromise;
}

export const canShowAds = () => consentAllows();

/** forget the loaded script state (used only in tests) */
export function resetMonetagLoader() {
    loadPromise = null;
}
