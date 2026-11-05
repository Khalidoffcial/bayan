/**
 * AdSidebar — the reserved right rail (LTR) / left rail (RTL).
 *
 * Layout: the page containers are already centered (margin-inline auto), so
 * the rail floats in the leftover space on the opposite side of the main
 * sidebar using position:fixed — it never pushes or squeezes content, and it
 * hides below 1200px where no comfortable rail exists.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { resolveAdContext } from "./adsConfig";
import { AdSlot } from "./AdSlot";
import useAuth from "../../hooks/useAuth";

export const AdSidebar = () => {
    const location = useLocation();
    const { user } = useAuth();
    const verdict = resolveAdContext(location.pathname);
    // landing/guest experience stays ad-free entirely
    if (!user?.id || !verdict.allowed) return null;
    return (
        <div className="ad-rail" data-ad-context={verdict.context}>
            <AdSlot zoneKey={verdict.zoneKey} />
        </div>
    );
};

export default React.memo(AdSidebar);
