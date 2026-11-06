/**
 * ExamsPage — Knowledge Challenges (Open Trivia DB) within the Exams section.
 * الوحيد المسؤول عن الاختبارات — لا تكرار مع أي قسم آخر.
 */
import React from "react";
import AppLayout from "../components/layout/AppLayout";
import KnowledgeChallenges from "../features/exams/components/KnowledgeChallenges";
import "../features/feed/styles/feed.css"; // .feed-container/.feed-main live here

export const ExamsPage = () => (
  <AppLayout>
    <KnowledgeChallenges />
  </AppLayout>
);

export default React.memo(ExamsPage);
