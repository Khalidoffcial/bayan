/**
 * adsConfig.js — central control for Monetag ads in Bayan Space.
 *
 * Design goals:
 *  - Ads live ONLY in reserved sidebar space on content pages + reading pages.
 *  - Hard denial for sensitive pages (Profile, Settings, Focus Space, auth…).
 *  - Zone ids come from env vars — nothing invented, nothing hardcoded.
 *  - Disable is global (master switch) or per-context, testable rules.
 */

/** master switch — set REACT_APP_MONETAG_ENABLED=false to kill everything */
const enabled = process.env.REACT_APP_MONETAG_ENABLED !== "false";

/**
 * Ad Zone ids from your Monetag account (Direct Link / Sidebar banner).
 * Leave empty → the whole system stays dormant (no script is ever loaded).
 */
export const AD_ZONES = {
    /** sidebar placement on feed/content pages */
    sidebar: process.env.REACT_APP_MONETAG_ZONE_SIDEBAR || "",
    /** sidebar placement on article/novel reading pages */
    reading: process.env.REACT_APP_MONETAG_ZONE_READING || "",
};

/**
 * Pages where ads are FORBIDDEN — checked by pathname.
 * Not CSS-hidden: the AdSlot component refuses to mount at all (no script
 * initialization, no zone rendering) when the route matches a deny rule.
 */
const DENY_ROUTES = [
    /^\/p\//,          // Profile pages
    /^\/settings/,     // Settings + all sub-pages
    /^\/focus/,        // Focus Space (and everything inside it)
    /^\/welcome/,      // Landing page
    /^\/signin/,
    /^\/signup/,
    /^\/privacy/,
    /^\/terms/,
    /^\/cookies/,
];

/** Route context resolution — the ONLY place that decides ad eligibility. */
export function resolveAdContext(pathname) {
    if (!enabled) return { allowed: false, reason: "disabled" };

    // explicit deny list wins over everything
    for (const re of DENY_ROUTES) {
        if (re.test(pathname)) return { allowed: false, reason: "denied_route" };
    }

    // allowed placements
    if (pathname === "/" || pathname === "/all" || pathname === "/posts" || pathname === "/articles" || pathname === "/novels") {
        return { allowed: true, context: "content", zoneKey: "sidebar" };
    }
    if (/^\/r\//.test(pathname) || /^\/rp\//.test(pathname)) { // article & post reading pages
        return { allowed: true, context: "reading", zoneKey: "reading" };
    }
    if (/^\/books/.test(pathname)) {
        return { allowed: true, context: "content", zoneKey: "sidebar" };
    }
    if (/^\/exams/.test(pathname)) {
        return { allowed: true, context: "content", zoneKey: "sidebar" };
    }

    // everything else (incl. user pages not covered) stays ad-free by default
    return { allowed: false, reason: "no_reserved_space" };
}

/** Real space check — measured against the actual layout:
 *  .feed-main is centered inside the FULL viewport (margin-inline: auto),
 *  so each side margin is (vw − 820) / 2. The rail (260 + 12px breathing)
 *  sits in the margin on the side away from the main sidebar; it must not
 *  touch the content edge (margin ≥ 300) nor clip (side must clear the
 *  260px sidebar too — true whenever margin ≥ 300 on a ≥1300px window). */
export function hasRailSpace() {
    if (typeof window === "undefined") return false;
    const margin = (window.innerWidth - 820) / 2;
    return margin >= 300; // ≈ viewport ≥ 1420px
}

export const adsEnabled = () => enabled && Boolean(AD_ZONES.sidebar || AD_ZONES.reading);
