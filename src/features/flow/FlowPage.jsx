/**
 * FlowPage — route container for Bayan Flow.
 *
 * Full-screen (AppLayout skips chrome for /flow). The viewer owns the
 * viewport; guests and logged-in users both get the experience per the
 * existing access model (the feed API already handles guest eligibility).
 */
import React from "react";
import FlowViewer from "./components/FlowViewer";

export const FlowPage = () => <FlowViewer />;

export default FlowPage;
