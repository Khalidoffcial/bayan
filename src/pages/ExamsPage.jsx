/**
 * ExamsPage — Knowledge Challenges (Open Trivia DB) within the Exams section.
 * الوحيد المسؤول عن الاختبارات — لا تكرار مع أي قسم آخر.
 */
import React from "react";
import Top from "../components/layout/Top";
import Sidebar from "../components/layout/Sidebar";
import InterestsPopup from "../components/common/InterestsModal";
import AdSidebar from "../features/ads/AdSidebar";
import KnowledgeChallenges from "../features/exams/components/KnowledgeChallenges";
import "../features/feed/styles/feed.css"; // .feed-container/.feed-main live here

export const ExamsPage = () => (
  <div className="feed-container">
    <Top />
    <Sidebar />
    <InterestsPopup />
    <AdSidebar />
    <div className="feed-main">
      <KnowledgeChallenges />
    </div>
  </div>
);

export default React.memo(ExamsPage);
