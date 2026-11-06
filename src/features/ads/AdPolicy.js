/**
 * AdPolicy — the SINGLE SOURCE OF TRUTH for advertising in Bayan Space.
 *
 * Security model: DEFAULT-DENY ALLOWLIST.
 *  - An unknown route, a new page, a private page, a sensitive page → NO ADS.
 *  - Only page types explicitly approved below may ever render an ad unit.
 *  - Nothing else in the codebase decides eligibility: components call these
 *    functions and obey the verdict.
 *
 * Placement model:
 *  - In-article: only inside eligible public article/novel reading content.
 *  - Sidebar: only in approved layouts that actually have a dedicated
 *    sidebar region; position follows the real application direction.
 *
 * This module is pure and framework-free (no React, no router) so it is
 * directly unit-testable and reusable from any layer.
 */

/* ── Approved page types (the entire allowlist) ──────────────────────── */
export const AD_APPROVED_PAGES = {
    /** public home / discovery feed — layout has a rail region */
    home: {
        sidebarAd: true,
        inArticleAd: false,
        patterns: ["/", "/all", "/posts", "/articles", "/novels"],
    },
    /** public article reading page (/r/:id with kind article) */
    articleReading: {
        sidebarAd: true,
        inArticleAd: true,
        patterns: [/^\/r\/[^/]+$/],
    },
    /** public novel reading page (same unified /r/:id route, novel kind) */
    novelReading: {
        sidebarAd: true,
        inArticleAd: true,
        patterns: [], // same route as articles — resolved via contentType
    },
};

/* ── Hard-deny list (belt & braces on top of default-deny) ─────────────
   Even if someone later adds a pattern that would match these, they stay
   forbidden: profile, settings, focus space, auth, admin, legal, account. */
const HARD_DENY = [
    /^\/p\//,        // profile pages
    /^\/settings/,   // settings + sub-pages
    /^\/focus/,      // focus space
    /^\/welcome/,    // guest landing
    /^\/signin/,     // login
    /^\/signup/,     // register
    /^\/admin/,      // admin/dashboard (if ever created)
    /^\/dashboard/,
    /^\/account/,    // account pages
    /^\/privacy/,
    /^\/terms/,
    /^\/cookies/,
    /^\/rp\//,       // post reading (not an approved page type)
];

/**
 * Page context the caller may supply to sharpen classification.
 * `contentType` distinguishes the unified /r/:id route (article vs novel);
 * `visibility`/`restricted` marks private or restricted content.
 */
const normalizeContext = (pageContext = {}) => ({
    contentType: pageContext.contentType || null, // "article" | "novel" | …
    visibility: pageContext.visibility || "public",
    restricted: Boolean(pageContext.restricted),
});

const matchApproved = (route) => {
    for (const [type, cfg] of Object.entries(AD_APPROVED_PAGES)) {
        for (const p of cfg.patterns) {
            const hit = typeof p === "string" ? p === route : p.test(route);
            if (hit) return type;
        }
    }
    return null;
};

/**
 * The core verdict. Returns null (no ads) unless the route matches an
 * approved page type AND the content is confidently public.
 *
 * @param {string} route        pathname, e.g. "/r/123"
 * @param {object} [pageContext]{ contentType, visibility, restricted }
 * @returns {{ page: string, sidebarAd: boolean, inArticleAd: boolean } | null}
 */
export function getAdPolicy(route, pageContext) {
    if (typeof route !== "string" || !route) return null;
    // normalize: strip trailing slash (but keep "/" itself)
    const path = route.length > 1 && route.endsWith("/") ? route.slice(0, -1) : route;

    // hard deny always wins
    if (HARD_DENY.some((re) => re.test(path))) return null;

    const pageType = matchApproved(path);
    if (!pageType) return null; // default-deny: unknown/new/unclassified → no ads

    const ctx = normalizeContext(pageContext);
    // private / restricted content can never carry ads, even on approved routes
    if (ctx.visibility !== "public" || ctx.restricted) return null;

    // the unified /r/:id route: in-article ads only for article/novel kinds;
    // the page label follows the contentType (novel kind → novelReading)
    if (pageType === "articleReading" || pageType === "novelReading") {
        const kind = (ctx.contentType || "article").toLowerCase(); // absent → article (public by contract)
        const inArticle = ["article", "novel", "articles", "novels"].includes(kind);
        const page = kind === "novel" || kind === "novels" ? "novelReading" : "articleReading";
        return { page, sidebarAd: true, inArticleAd: inArticle };
    }

    const cfg = AD_APPROVED_PAGES[pageType];
    return { page: pageType, sidebarAd: cfg.sidebarAd, inArticleAd: cfg.inArticleAd };
}

/** Sidebar display ad (slot 8671904268) allowed on this route/context? */
export function canShowSidebarAd(route, pageContext) {
    const policy = getAdPolicy(route, pageContext);
    return Boolean(policy?.sidebarAd);
}

/** In-article ad (slot 1256448677) allowed on this route/context? */
export function canShowInArticleAd(route, pageContext) {
    const policy = getAdPolicy(route, pageContext);
    return Boolean(policy?.inArticleAd);
}

/** Minimum viewport width that has a real sidebar rail region. */
const RAIL_MIN_WIDTH = 1420;

/**
 * Physical sidebar placement for the ad rail, derived from the REAL
 * application direction (isRtlLanguage via SettingsContext — never from
 * the URL and never hardcoded per language).
 *
 * LTR → right sidebar · RTL → left sidebar.
 *
 * @param {string} direction  "rtl" | "ltr"
 * @param {{ viewportWidth?: number, hasSidebarRegion?: boolean }} [layoutContext]
 * @returns {{ allowed: boolean, side: "start"|"end", cssInset: string, minWidth: number } | { allowed: false }}
 */
export function getSidebarAdPosition(direction, layoutContext = {}) {
    const { viewportWidth, hasSidebarRegion = true } = layoutContext;
    const width = typeof viewportWidth === "number"
        ? viewportWidth
        : (typeof window !== "undefined" ? window.innerWidth : 0);

    if (!hasSidebarRegion) return { allowed: false, reason: "no_sidebar_region" };
    if (width < RAIL_MIN_WIDTH) return { allowed: false, reason: "insufficient_width" };

    const isRtl = direction === "rtl";
    return {
        allowed: true,
        side: isRtl ? "start" : "end", // logical side: left in RTL, right in LTR
        cssInset: isRtl ? "inset-inline-start" : "inset-inline-end",
        minWidth: RAIL_MIN_WIDTH,
    };
}

export default {
    AD_APPROVED_PAGES,
    getAdPolicy,
    canShowSidebarAd,
    canShowInArticleAd,
    getSidebarAdPosition,
};
