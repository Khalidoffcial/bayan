import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Loader from "../components/ui/Loader";
import ErrorBoundary from "../components/ui/ErrorBoundary";

// Lazy Loaded Page Containers
const HomePage = lazy(() => import("../pages/Home"));
const FeedPage = lazy(() => import("../pages/FeedPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const ArticlePage = lazy(() => import("../pages/ArticlePage"));
const PostPage = lazy(() => import("../pages/PostPage"));
const SignupPage = lazy(() => import("../pages/SignupPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const SettingsPage = lazy(() => import("../pages/Settings"));
const LandingPage = lazy(() => import("../features/landing/LandingPage"));
const PrivacyPage = lazy(() => import("../pages/LegalPages").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("../pages/LegalPages").then(m => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import("../pages/LegalPages").then(m => ({ default: m.CookiesPage })));
const FocusSpacePage = lazy(() => import("../features/focus-space/FocusSpacePage"));
const FlowPage = lazy(() => import("../features/flow/FlowPage"));
const ExamsPage = lazy(() => import("../pages/ExamsPage"));
const BooksPage = lazy(() => import("../pages/BooksPage"));
const BookReaderPage = lazy(() => import("../pages/BookReaderPage"));

export const AppRoutes = () => {
  // Route-level containment: a crashed lazy page shows an inline error with
  // Retry instead of destroying the whole tree (white screen). Remounting
  // the boundary on every location change guarantees recovery on navigate.
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} labelKey="error.generic">
    <Suspense
      fallback={
        <div className="app-loader" role="status" aria-label="جارٍ التحميل">
          <Loader size="page" />
        </div>
      }
    >
      <Routes>
        {/* الصفحة التعريفية للزائر غير المسجل */}
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/" element={<HomePage />} />
        {/* /all: نفس المسار الرئيسي — redirect يحافظ على الروابط القديمة
            دون إنشاء Feed ثانٍ أو طلبات مكررة */}
        <Route path="/all" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Books — free & legally-readable library (unified providers) */}
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:provider/:providerBookId" element={<BookReaderPage />} />
        {/* Knowledge Challenges — قسم Exams الحقيقي (يجب أن يسبق /:typeArticle) */}
        <Route path="/exams" element={<ExamsPage />} />
        {/* Focus Space — مساحة الدراسة الغامرة (full-screen) */}
        <Route path="/focus" element={<FocusSpacePage />} />
        {/* Bayan Flow — اكتشاف عمودي غامر (full-screen) */}
        <Route path="/flow" element={<FlowPage />} />
        <Route path="/p/:idOtherUser" element={<ProfilePage />} />
        <Route path="/:typeArticle" element={<FeedPage />} />
        <Route path="/r/:articleId" element={<ArticlePage />} />
        <Route path="/rp/:postId" element={<PostPage />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes;
