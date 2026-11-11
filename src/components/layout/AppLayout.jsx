/**
 * AppLayout — the ONE place that owns application chrome and workspace
 * structure. Pages render only their content composition.
 *
 * Structure (semantic hierarchy):
 *   AppLayout
 *   ├── Top              — fixed header
 *   ├── Sidebar          — fixed navigation
 *   ├── InterestsPopup   — global modal
 *   └── .app-workspace   — the main application workspace
 *       ├── .app-content — the ONE shared content column (width token)
 *       │   └── children = page composition (Hero, Composer, Feed, …)
 *       └── AdRail       — independent secondary rail (only where eligible)
 *
 * Rail eligibility is decided by AdPolicy; AppLayout just asks it. The rail
 * is a sibling of .app-content, never a child of hero/feed/content.
 */
import React from "react";
import { useLocation } from "react-router-dom";
import Top from "./Top";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import InterestsPopup from "../common/InterestsModal";
import AdSidebar from "../../features/ads/AdSidebar";
import { canShowSidebarAd } from "../../features/ads/AdPolicy";

/**
 * PageContent — the single shared content column.
 *
 * width: min(--content-max-width, 100%) — the width token lives HERE, once.
 * margin-inline: auto centers it in the workspace between the fixed nav
 * sidebar and the rail/viewport edge (direction-safe logical properties).
 *
 * Children keep full internal freedom; this is an outer boundary only.
 */
export const PageContent = ({ children, className = "" }) => (
    <div className={`app-content ${className}`}>{children}</div>
);

/* Full-screen experiences (Focus Space, Bayan Flow) get no workspace chrome. */
const FULLSCREEN_PATHS = [/^\/focus/, /^\/flow/];

export const AppLayout = ({ children }) => {
    const location = useLocation();
    const path = location.pathname;

    if (FULLSCREEN_PATHS.some((re) => re.test(path))) {
        return <>{children}</>; // Focus Space owns the entire viewport itself
    }

    const railEligible = canShowSidebarAd(path, { visibility: "public" });
    // (AdSidebar itself also refuses for guests — AdPolicy decides eligibility,
    //  the guest rule lives in AdSidebar where the auth state already exists.)

    return (
        <div className="app-shell">
            <Top />
            <Sidebar />
            <BottomNav />
            <InterestsPopup />
            <main id="main-workspace" className="app-workspace">
                <PageContent>{children}</PageContent>
                {railEligible && <AdSidebar />}
            </main>
        </div>
    );
};

export default AppLayout;
