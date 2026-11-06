/**
 * AdSidebar — the reserved sidebar region for the AdSense display unit.
 *
 * Rendered by AppLayout as a sibling of .app-content inside .app-workspace.
 * Eligibility is decided ONLY by the centralized AdPolicy allowlist (plus
 * the guest rule here, since auth state already exists in this component).
 * The rail is a normal element in the page flow (static, flex item of the
 * workspace): right side in LTR, left side in RTL — never fixed, sticky,
 * floating or overlaying. It renders nothing and reserves zero space when
 * ineligible or when there is no sidebar region (narrow screens).
 */
import React from "react";
import { useLocation } from "react-router-dom";
import { canShowSidebarAd } from "./AdPolicy";
import { AdSenseSidebar } from "./AdSenseSidebar";
import useAuth from "../../hooks/useAuth";

export const AdSidebar = () => {
    const location = useLocation();
    const { user } = useAuth();
    // guests (landing experience) stay ad-free entirely
    if (!user?.id) return null;
    // Single source of truth — the centralized AdPolicy allowlist.
    if (!canShowSidebarAd(location.pathname, { visibility: "public" })) return null;
    return (
        <aside className="ad-rail" aria-label="Sponsored">
            <AdSenseSidebar />
        </aside>
    );
};

export default React.memo(AdSidebar);
