/**
 * monetag.js — single-flight Monetag script loader.
 *
 * The zone script is injected ONCE per app lifetime. React route changes
 * never re-download it; zones are rendered/destroyed by the AdSlot component
 * through Monetag's window.zd Hurricane API if present, or simply by keeping
 * the reserved container mounted/unmounted.
 *
 * No user data is passed to Monetag. Nothing runs when no zone ids exist.
 */

let loadPromise = null;

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
            if (window.__bayanMonetagReady) { resolve(true); return; }
            if (document.querySelector("script[data-bayan-monetag]")) { resolve(true); return; }
            const s = document.createElement("script");
            s.src = "//libtl.com/sdk.js"; // Monetag SDK — replaced per your account instructions
            s.setAttribute("data-zone", "true");
            s.setAttribute("data-sdk", "show_9267406");
            s.setAttribute("data-bayan-monetag", "1");
            s.async = true;
            s.onerror = () => { loadPromise = null; resolve(false); }; // soft-fail: site unaffected
            s.onload = () => {
                window.__bayanMonetagReady = true;
                resolve(true);
            };
            document.head.appendChild(s);
        });
    }
    return loadPromise;
}

export const canShowAds = () => consentAllows();

/** forget the loaded script state (used only in tests) */
export function resetMonetagLoader() {
    loadPromise = null;
}
