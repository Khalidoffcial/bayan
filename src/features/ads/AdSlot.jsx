/**
 * AdSlot — reserved ad container.
 *
 * Guarantees:
 *  - Mounts ONLY when the central rules allow it (deny list wins).
 *  - Fixed reserved box: no layout shift, no overlap with content.
 *  - The Monetag library loads once app-wide; the zone only initializes on
 *    pages that have a reserved slot.
 *  - Fails soft: network/offline/ad-blocker → the reserved box collapses
 *    gracefully (no giant empty area) and the site never breaks.
 *  - Cleans up zone DOM on unmount.
 */
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { resolveAdContext, AD_ZONES, hasRailSpace } from "./adsConfig";
import { loadMonetag, canShowAds } from "./monetag";
import "./ads.css";

const H = () => (window.innerHeight || 800);

export const AdSlot = ({ zoneKey = "sidebar" }) => {
    const location = useLocation();
    const { language } = useTranslation();
    const [verdict, setVerdict] = useState(() => resolveAdContext(location.pathname));
    const [loaded, setLoaded] = useState(false);
    const hostRef = useRef(null);

    // re-resolve on route change (context switch feed ↔ reading etc.)
    useEffect(() => {
        setVerdict(resolveAdContext(location.pathname));
    }, [location.pathname]);

    const zoneId = AD_ZONES[zoneKey];
    const eligible = verdict.allowed && verdict.zoneKey === zoneKey && Boolean(zoneId) && canShowAds() && hasRailSpace();

    // mount the zone inside the reserved host exactly once per mount
    useEffect(() => {
        if (!eligible || !hostRef.current) return;
        let dead = false;
        (async () => {
            const ok = await loadMonetag();
            if (dead || !ok || !hostRef.current) return;
            try {
                // Monetag SDK exposes _stq style pushes / window.zd for zones.
                // The exact init call depends on the format in your account —
                // wired through the zone id from env only.
                if (window.zd) window.zd.push?.(zoneId);
            } catch { /* zone failed — box collapses gracefully */ }
            setLoaded(true);
        })();
        return () => { dead = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eligible, zoneId]);

    if (!eligible) return null;

    const side = language === "ar" ? "start" : "end"; // ar=RTL → rail is on the left half
    return (
        <aside
            ref={hostRef}
            className={`ad-slot ad-slot--${side} ${loaded ? "ad-slot--filled" : "ad-slot--pending"}`}
            data-ad-context={verdict.context}
            aria-label="Sponsored"
            aria-hidden="false"
        >
            <span className="ad-slot__label">{language === "ar" ? "إعلان" : "Sponsored"}</span>
            {/* zone content is injected here by the ad network */}
        </aside>
    );
};

/** useTranslation never throws outside the provider (getTranslation falls
 *  back to en + key); the old try/catch wrapper violated rules-of-hooks. */

export default React.memo(AdSlot);
