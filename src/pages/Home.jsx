import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Content from '../components/layout/Content';
import cookie from "../utils/cookies";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import '../App.css';

/**
 * Root route auth gate (bugfix: premature redirect to /welcome).
 *
 * Three distinct states — an unresolved verification is NEVER treated as
 * "unauthenticated":
 *   loading         → auth not yet verified → lightweight loader, NO redirect
 *   authenticated   → valid session → render the app
 *   unauthenticated → CONFIRMED invalid/expired token (401/403) → /welcome
 *
 * Backend unavailable (network error / 5xx / timeout) → recoverable inline
 * error with Retry; the session and cookies are preserved (spec Phase 4).
 *
 * Note: the token is a NON-HttpOnly client-managed credential (login stores
 * it via utils/cookies into a js-cookie `token` or localStorage), so reading
 * it client-side is correct here and does not touch admin/Firebase auth.
 */
export const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState(
    // Session hint: a previously-logged-in user starts as "restoring" instead
    // of flashing the redirect; no hint at all → still verifying, not a guest.
    localStorage.getItem("me") ? "restoring" : "loading"
  );

  useEffect(() => {
    let cancelled = false;

    const goWelcome = () => {
      if (cancelled) return;
      // preserve deep-link destination for post-login return
      navigate("/welcome", { replace: true, state: { from: location.pathname } });
    };

    const token = cookie("get");
    if (!token) {
      // No client-visible credential AND no cached profile → confirmed guest.
      // With a cached profile, try /auth once anyway — the token may exist in
      // storage variants cookie("get") already covers; if truly absent the
      // request fails with 401 and we land in the confirmed-unauth path.
      if (!localStorage.getItem("me")) { goWelcome(); return; }
      setAuthState("unauthenticated");
      goWelcome();
      return;
    }

    setAuthState("restoring");
    axios
      .post(API_ENDPOINTS.AUTH, {}, { headers: { Authorization: "Bearer " + token }, timeout: 10000 })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 200 && res.data?.userData) {
          localStorage.setItem("me", JSON.stringify(res.data.userData));
          setAuthState("authenticated");
        } else {
          // 200 without userData is anomalous → treat as confirmed unauth
          setAuthState("unauthenticated");
          goWelcome();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        const isAuthRejection =
          status === 401 ||
          (status === 403 && !err?.response?.data?.degraded);
        if (isAuthRejection) {
          // CONFIRMED invalid/expired/banned → clear stale local profile, redirect
          localStorage.removeItem("me");
          setAuthState("unauthenticated");
          goWelcome();
        } else {
          // Network/server error/timeout — session is NOT dead. Recoverable error UI.
          setAuthState("error");
        }
      });

    return () => { cancelled = true; };
  }, [navigate, location.pathname]);

  if (authState === "loading" || authState === "restoring") {
    return (
      <div className="app-loader" role="status" aria-label="جارٍ التحقق من الجلسة">
        <div className="app-loader__spinner" />
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div style={{
        minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>تعذر الاتصال بالخادم</h2>
        <p style={{ color: "#8b96ab", maxWidth: 420 }}>
          تعذر التحقق من جلستك الآن — لم يتم تسجيل خروجك. يمكنك إعادة المحاولة.
        </p>
        <button
          onClick={() => setAuthState(localStorage.getItem("me") ? "restoring" : "loading")}
          style={{
            background: "#4A7DFF", color: "#fff", border: 0, borderRadius: 8,
            padding: "10px 22px", cursor: "pointer", fontWeight: 600,
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // AppLayout owns the chrome + workspace + ad rail; the homepage composes
  // its own content (Spotlight hero + Feed) inside the shared column.
  return (
    <AppLayout>
      <Content />
    </AppLayout>
  );
};

export default React.memo(HomePage);
