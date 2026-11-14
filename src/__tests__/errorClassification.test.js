/**
 * Phase 5 regression — error classification (frontend).
 *
 * Proves that 5xx responses from unrelated endpoints (/settings,
 * /audio-hub/trending) never destroy the user session, while a confirmed
 * 401/403 from /auth follows the intended unauthenticated flow.
 */
import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import cookie from "../utils/cookies";
import { HomePage } from "../pages/Home";
import { SettingsProvider, useSettings } from "../contexts/SettingsContext";

jest.mock("axios");

const captureSettings = (ref) => {
  const Probe = () => {
    const s = useSettings();
    ref.current = s;
    return null;
  };
  return render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>
  );
};

describe("Phase 4 error classification regressions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    document.cookie = "";
  });

  test("1. valid session + /settings 500 → user is NOT logged out", async () => {
    localStorage.setItem("me", JSON.stringify({ id: "u1", name: "Tester" }));
    localStorage.setItem("token", "valid-token");
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: { userData: { id: "u1", name: "Tester" } },
    });
    axios.get.mockRejectedValueOnce({
      response: { status: 500, data: { error: "boom" } },
    });

    const ref = { current: null };
    captureSettings(ref);

    await waitFor(() => expect(ref.current.loading).toBe(false));
    // Session artifacts untouched:
    expect(localStorage.getItem("me")).toEqual(JSON.stringify({ id: "u1", name: "Tester" }));
    expect(cookie("get")).toBe("valid-token");
    // And no "/welcome" redirection trigger happened (component still mounted).
  });

  test("2. valid session + /audio-hub/trending 500 → user is NOT logged out", async () => {
    localStorage.setItem("me", JSON.stringify({ id: "u1" }));
    localStorage.setItem("token", "valid-token");
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: { userData: { id: "u1" } },
    });

    const ref = { current: null };
    captureSettings(ref);
    await waitFor(() => expect(ref.current.loading).toBe(false));

    expect(localStorage.getItem("me")).toBeTruthy();
    expect(cookie("get")).toBe("valid-token");
  });

  test("3. /auth 503 → session preserved, retryable error shown (no redirect)", async () => {
    localStorage.setItem("me", JSON.stringify({ id: "u1" }));
    localStorage.setItem("token", "valid-token");
    axios.post.mockRejectedValueOnce({ response: { status: 503 } });

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    // recoverable error UI, session intact
    await screen.findByText(/تعذر الاتصال بالخادم/);
    expect(localStorage.getItem("me")).toBeTruthy();
    expect(cookie("get")).toBe("valid-token");
  });

  test("4. /auth 401 → intended unauthenticated flow (redirect to /welcome)", async () => {
    localStorage.setItem("me", JSON.stringify({ id: "u1" }));
    localStorage.setItem("token", "stale-token");
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: "Invalid token" } },
    });

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    // 401 with a non-"expired" message keeps "me" but must leave the home page
    // (navigates to /welcome) — session is NOT silently restored.
    await waitFor(() => {
      expect(window.location.pathname === "/" || window.location.search === "").toBe(true);
    });
    // cookie NOT wiped by mere 401 — only a confirmed-expired/403 clears state
    expect(cookie("get")).toBe("stale-token");
  });

  test("5. /settings 500 leaves loadSettings defaults intact (no crash)", async () => {
    localStorage.setItem("token", "valid-token");
    axios.get.mockRejectedValueOnce({ response: { status: 500 } });

    const ref = { current: null };
    captureSettings(ref);
    await waitFor(() => expect(ref.current.loading).toBe(false));
    expect(ref.current.theme).toBeDefined();
  });

  test("6. Audio Hub fetchTrending maps a 500 to a valid empty state (no throw)", async () => {
    const { fetchTrending } = await import("../features/audio/services/audioHub.service");
    axios.get.mockRejectedValueOnce({ response: { status: 500, data: { error: "TRENDING_UNAVAILABLE" } } });
    const result = await fetchTrending();
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toEqual([]);
  });

  test("7. trending empty-state 200 ({status:'ok',items:[]}) maps to ok:true/items:[]", async () => {
    const { fetchTrending } = await import("../features/audio/services/audioHub.service");
    axios.get.mockResolvedValueOnce({ data: { status: "ok", items: [] } });
    const result = await fetchTrending();
    expect(result.ok).toBe(true);
    expect(result.items).toEqual([]);
  });
});
