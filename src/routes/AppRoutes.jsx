import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "../components/ui/Loader";

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

export const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="app-loader">
          <Loader />
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
        <Route path="/p/:idOtherUser" element={<ProfilePage />} />
        <Route path="/:typeArticle" element={<FeedPage />} />
        <Route path="/r/:articleId" element={<ArticlePage />} />
        <Route path="/rp/:postId" element={<PostPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
