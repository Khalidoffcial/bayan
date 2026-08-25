import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
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
        <Route path="/" element={<HomePage />} />
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
