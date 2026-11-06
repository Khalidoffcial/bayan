/**
 * AdSenseSidebar — Google AdSense responsive display unit (slot 8671904268).
 *
 * Eligibility is decided ONLY by the centralized AdPolicy module
 * (default-deny allowlist) — this component never inspects routes itself.
 *
 * Direction: getSidebarAdPosition derives the physical side from the REAL
 * application direction (isRtlLanguage via useTranslation): LTR → right
 * sidebar (inline-end), RTL → left sidebar (inline-start). Nothing is
 * inferred from the URL and no language is hardcoded.
 *
 * The unit renders inside the existing sidebar rail region of approved
 * layouts. If there is no dedicated sidebar region (mobile / narrow
 * layouts) or the viewport is too narrow, it renders NOTHING — it is never
 * a popup, overlay, floating card, or sticky banner.
 */
import React, { useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    canShowSidebarAd,
    getSidebarAdPosition,
} from "./AdPolicy";
import { useTranslation } from "../../i18n/useTranslation";
import { ADSENSE_CLIENT } from "./AdSenseInArticle";
import useAdSensePush from "./useAdSensePush";
import "./ads.css";

/* Publisher-supplied slot for the sidebar display unit — never invented. */
export const ADSENSE_SIDEBAR_SLOT = "8671904268";

export const AdSenseSidebar = () => {
    const location = useLocation();
    const { language, dir } = useTranslation();
    const insRef = useRef(null);

    // Single source of truth — the centralized AdPolicy allowlist.
    const eligible = canShowSidebarAd(location.pathname, {
        visibility: "public",
    });

    // Responsive + direction rules (desktop/tablet with enough width; hidden
    // on mobile / layouts without a dedicated sidebar region).
    const position = getSidebarAdPosition(dir, {
        viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
        hasSidebarRegion: eligible, // no policy → no region → no ad
    });

    useAdSensePush(insRef, position.allowed);

    // If the ad request hangs (blocked network, no inventory answer), the
    // unit would otherwise reserve a tall empty column. After a grace period
    // without a fill, collapse the reserved space. If Google fills the ad
    // later, the class is removed and the space is restored.
    const [idle, setIdle] = React.useState(false);
    React.useEffect(() => {
        if (!position.allowed) return;
        const timer = setTimeout(() => {
            const ins = insRef.current;
            // Only Google's own fill signal counts — an aborted/hung request
            // leaves the unit empty, and helper iframes (sodar etc.) are not ads.
            const filled = ins && ins.getAttribute("data-ad-status") === "fill";
            if (!filled) setIdle(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [position.allowed]);

    if (!position.allowed) return null;
    // Grace period elapsed without a Google fill → remove the unit from the
    // flow entirely (an inline height on the <ins> would defeat a CSS-only
    // collapse). If a fill arrives after a later remount, it renders again.
    if (idle) return null;

    return (
        <div
            className={`adsense-sidebar${idle ? " adsense-sidebar--idle" : ""}`}
            data-ad-context={language === "ar" ? "rtl" : "ltr"}
            dir={dir} /* mirrors the real page direction */
            aria-label="Sponsored"
        >
            <span className="adsense-sidebar__label">
                {language === "ar" ? "إعلان" : "Sponsored"}
            </span>
            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={ADSENSE_CLIENT}
                data-ad-slot={ADSENSE_SIDEBAR_SLOT}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default React.memo(AdSenseSidebar);
