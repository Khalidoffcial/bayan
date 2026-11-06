/**
 * AdSenseInArticle — Google AdSense In-Article unit for reading pages.
 *
 * Guarantees:
 *  - The AdSense library itself is loaded exactly once app-wide from
 *    public/index.html (same publisher id). This component NEVER injects a
 *    second <script> — it only pushes into the existing window.adsbygoogle.
 *  - Eligibility is decided by the central AdPolicy module (default-deny
 *    allowlist): ONLY public article/novel reading pages (/r/:id).
 *    Profile, Settings, Focus Space, auth, landing, legal, feed, unknown
 *    and newly added routes are denied by default.
 *  - Idempotent init: a per-instance ref flag + a data attribute on the <ins>
 *    make push({}) run exactly once per element, even under React StrictMode
 *    double-invoked effects or re-renders.
 *  - Fails silent: if the library is blocked/unavailable nothing is pushed,
 *    no retry loops, no fake ad-looking placeholder — the box simply has no
 *    height and the reading flow is untouched.
 */
import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { canShowInArticleAd } from "./AdPolicy";
import "./ads.css";

/* Publisher-supplied values — byte-exact from the AdSense account. */
export const ADSENSE_CLIENT = "ca-pub-3131941819638704";
export const ADSENSE_IN_ARTICLE_SLOT = "1256448677";

/* contentType on the unified /r/:id route comes as the plural collection
   name ("articles" / "novels"); normalize for AdPolicy. */
const normalizeKind = (ct) => {
    const k = (ct || "").toLowerCase();
    if (k === "novels") return "novel";
    if (k === "articles" || k === "novel") return k;
    return "article";
};

/**
 * Splits raw article/novel HTML into two segments around an in-article ad.
 *
 * Rules:
 *  - Counts only block-level content blocks (p, headings, lists, blockquote,
 *    pre, figure, div, hr, table) — the ad can never land inside a paragraph.
 *  - Insertion point: after the 4th block when there are ≥ 7 blocks,
 *    after the 3rd block when there are ≥ 5 blocks.
 *  - Shorter content → no ad at all (showAd: false).
 *  - Pure text (single block) → no ad.
 *
 * @returns {{ headHtml: string, tailHtml: string, showAd: boolean }}
 */
export function splitContentForInArticleAd(html) {
    const none = { headHtml: html || "", tailHtml: "", showAd: false };
    if (typeof window === "undefined" || typeof DOMParser === "undefined" || !html) {
        return none;
    }
    try {
        const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
        const blocks = Array.from(doc.body.children).filter((el) =>
            /^(P|H[1-6]|UL|OL|BLOCKQUOTE|PRE|FIGURE|DIV|HR|TABLE)$/.test(el.tagName)
        );
        const count = blocks.length;
        let afterIndex = -1; // ad is placed after blocks[afterIndex]
        if (count >= 7) afterIndex = 3;      // after the 4th block
        else if (count >= 5) afterIndex = 2; // after the 3rd block
        if (afterIndex < 0) return none;

        // Rebuild the two halves from the serialized top-level children —
        // deterministic across browsers, never splits inside a block.
        const children = Array.from(doc.body.children);
        const cut = blocks[afterIndex];
        const cutIdx = children.indexOf(cut);
        const headHtml = children.slice(0, cutIdx + 1).map((n) => n.outerHTML).join("");
        const tailHtml = children.slice(cutIdx + 1).map((n) => n.outerHTML).join("");
        return { headHtml, tailHtml, showAd: true };
    } catch {
        return none; // malformed content → reading page stays untouched
    }
}

export const AdSenseInArticle = ({ contentType }) => {
    const location = useLocation();
    const insRef = useRef(null);
    const pushedRef = useRef(false);

    // Single source of truth — the centralized AdPolicy allowlist.
    const eligible = canShowInArticleAd(location.pathname, {
        contentType: normalizeKind(contentType),
        visibility: "public",
    });

    useEffect(() => {
        if (!eligible) return;
        const ins = insRef.current;
        if (!ins || pushedRef.current) return;          // StrictMode / re-render guard
        if (ins.dataset.adsenseInit === "1") return;    // same element already initialized
        if (typeof window === "undefined") return;

        // Library missing (blocked, offline, slow) → stay silent. No retry
        // loop, no fake placeholder — reading page keeps working normally.
        if (!window.adsbygoogle) return;

        try {
            pushedRef.current = true;
            ins.dataset.adsenseInit = "1";
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // Never let a failed ad push break the reading page.
            pushedRef.current = false;
            delete ins.dataset.adsenseInit;
        }
    }, [eligible]);

    // Note: pushedRef logic above is identical to useAdSensePush.js — kept
    // inline for this component's existing tests; new units use the hook.

    if (!eligible) return null;

    return (
        <div className="adsense-in-article" aria-label="Sponsored">
            {/* The unit itself is direction-neutral; page text direction is untouched. */}
            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: "block", textAlign: "center" }}
                data-ad-layout="in-article"
                data-ad-format="fluid"
                data-ad-client={ADSENSE_CLIENT}
                data-ad-slot={ADSENSE_IN_ARTICLE_SLOT}
            />
        </div>
    );
};

export default React.memo(AdSenseInArticle);
