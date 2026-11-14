import Cookies from 'js-cookie';

/**
 * Unified token storage — ONE canonical key ("token").
 *
 * - The token always lives in localStorage under "token" (durable across
 *   refresh / browser reopen / new tab) PLUS a 60-day cookie for extra
 *   persistence where storage is restricted.
 * - Legacy keys ("Token" in localStorage, legacy cookie names) are read for
 *   MIGRATION ONLY and removed whenever a new token is stored — an existing
 *   valid session is never lost during the transition.
 */
export default function cookie(any) {
  if (any === "get") {
    return (
      localStorage.getItem("token") ||
      Cookies.get('token') ||
      (() => { try { return sessionStorage.getItem("token"); } catch { return null; } })() ||
      localStorage.getItem("Token") || // legacy (pre-unification) — migration only
      null
    );
  }
  if (any === "remove") {
    Cookies.remove('token');
    localStorage.removeItem("token");
    localStorage.removeItem("Token");
    try { sessionStorage.removeItem("token"); } catch { /* ignore */ }
    return;
  }
  if (typeof any === "string" && any.startsWith("ey")) {
    // Accept JWT-looking strings only — never store arbitrary junk.
    Cookies.set('token', any, {
      expires: 60,
      secure: typeof window !== "undefined" && window.location.protocol === "https:",
      sameSite: "Lax",
    });
    localStorage.setItem("token", any);
    // MIGRATION: retire the legacy uppercase variant once a canonical token exists.
    localStorage.removeItem("Token");
  }
}
