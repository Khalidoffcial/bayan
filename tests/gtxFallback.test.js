/**
 * gtx fallback provider tests — extends libretranslate.test.js coverage:
 *  1. Arabic → English via gtx (enabled, Libre unconfigured).
 *  2. English → Arabic.
 *  3. Third language (fr → ar).
 *  4. Language detection through gtx.
 *  5. Provider unavailable (gtx disabled, Libre unconfigured) — structured error.
 *  6. Provider timeout → PROVIDER_TIMEOUT.
 *  7. Recovery: Libre down → gtx serves; Libre recovers → primary used again.
 *  8. Cache hit + hash invalidation.
 *  9. HTML/link preservation through segmentation.
 * 10. Rate-limit enforcement unchanged.
 * 11. Empty / oversized content.
 * 12. Unsupported language.
 * No real network: node-fetch mocked; gtx responses mocked at HTTP level.
 */
process.env.NODE_ENV = "test";

let mockHandler = null;
const mockFetch = jest.fn(async (url, opts) => {
  if (!mockHandler) throw new Error("handler not set");
  const raw = String(url);
  const body = opts?.body ? JSON.parse(opts.body) : null;
  const res = await mockHandler(raw, body, opts); // await: hanging mocks truly hang
  if (res instanceof Error) throw res;
  // gtx returns JSON text (node-fetch v2 style handled by service)
  return {
    ok: res.ok ?? true,
    status: res.status ?? 200,
    text: async () => res.text ?? JSON.stringify(res.json),
    json: async () => (typeof res.json === "function" ? res.json() : JSON.parse(res.text ?? "{}")),
  };
});
jest.mock("node-fetch", () => mockFetch);

const svcPath = "../service/translation.service.js";
const loadSvc = (env = {}) => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = env.libreUrl ?? "";
  delete process.env.LIBRETRANSLATE_API_KEY;
  if (env.gtx === "off") delete process.env.TRANSLATION_GTX_ENABLED;
  else process.env.TRANSLATION_GTX_ENABLED = env.gtx === undefined ? "1" : env.gtx;
  delete process.env.TRANSLATION_PRIMARY_RETRY_MS; // fresh cooldown each module
  return require(svcPath);
};

// ---- mock builders -------------------------------------------------------
// gtx payload: [[ [translated, original, null, null, score], ... ], null, "detected", ...]
const gtxJson = (text, detected) => JSON.stringify([[[text, "src", null, null, 10],], null, detected || "en"]);
const libreLangs = (codes) => codes.map((c) => ({ code: c }));
const isGtx = (url) => url.includes("translate.googleapis.com");

beforeEach(() => { mockHandler = null; });
  afterEach(() => { mockHandler = null; });

describe("gtx fallback provider", () => {
  test("PROVIDER_UNAVAILABLE (structured, not silent success) when every provider is off", async () => {
    const { translateContent } = loadSvc({ gtx: "off" });
    const result = await translateContent({ contentId: "a1", content: "hello", targetLang: "ar", userId: "u" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("PROVIDER_UNAVAILABLE");
    expect(result.translatedText).toBeUndefined();
  });

  test("Arabic → English via gtx, detection returns 'ar'", async () => {
    mockHandler = (url) => {
      if (isGtx(url)) {
        if (/tl=en/.test(url)) return { status: 200, text: gtxJson("Hello", "ar") };
        return { status: 200, text: gtxJson("detect-only", "ar") };
      }
      return { status: 500, text: JSON.stringify({ error: "down" }) };
    };
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "g1", content: "مرحبا", targetLang: "en", userId: "u1" });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toBe("Hello");
    expect(result.sourceLang).toBe("ar");
  });

  test("English → Arabic via gtx", async () => {
    mockHandler = (url) => (isGtx(url)
      ? { status: 200, text: gtxJson("مرحبا", "en") }
      : { status: 500, text: "{}" });
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "g2", content: "hello", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toBe("مرحبا");
  });

  test("third language: French → Arabic", async () => {
    mockHandler = (url) => (isGtx(url)
      ? { status: 200, text: gtxJson("بونجور", "fr") }
      : { status: 500, text: "{}" });
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "g3", content: "bonjour", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toBe("بونجور");
    expect(result.sourceLang).toBe("fr");
  });

  test("SAME_LANGUAGE still enforced through fallback detection", async () => {
    mockHandler = (url) => (isGtx(url)
      ? { status: 200, text: gtxJson("hello", "en") }
      : { status: 500, text: "{}" });
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "g4", content: "hello", targetLang: "en", userId: "u1" });
    expect(result.error).toBe("SAME_LANGUAGE");
  });

  test("failover: Libre misbehaves → gtx serves the translation", async () => {
    mockHandler = (url) => {
      if (isGtx(url)) return { status: 200, text: gtxJson("fallback-hit", "en") };
      // Libre configured but returning garbage (INVALID_RESPONSE path)
      if (url.endsWith("/languages")) return { ok: true, status: 200, json: async () => libreLangs(["en", "ar"]) };
      if (url.endsWith("/detect")) return { ok: true, status: 200, json: async () => [{ language: "en", confidence: 90 }] };
      return { ok: true, status: 200, json: async () => ({ unexpected: true }) };
    };
    const { translateContent } = loadSvc({ libreUrl: "http://mock-libre:5000" });
    const result = await translateContent({ contentId: "g5", content: "hello", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toBe("fallback-hit");
  });

  test("failover suppressed on user-side errors (RATE_LIMITED never retried via gtx)", async () => {
    mockHandler = (url) => {
      if (isGtx(url)) return { status: 200, text: gtxJson("should-not-happen", "en") };
      if (url.endsWith("/languages")) return { ok: true, status: 200, json: async () => libreLangs(["en", "ar"]) };
      if (url.endsWith("/detect")) return { ok: true, status: 200, json: async () => [{ language: "en" }] };
      return { ok: false, status: 429, json: async () => ({ error: "rate" }) };
    };
    const { translateContent } = loadSvc({ libreUrl: "http://mock-libre:5000" });
    const result = await translateContent({ contentId: "g6", content: "hello", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("RATE_LIMITED");
  });

  test("timeout → structured error, no hang when both providers stall", async () => {
    jest.setTimeout(45000);
    mockHandler = (url) => {
      if (isGtx(url)) return new Promise(() => { }); // hang → withTimeout fires
      if (url.endsWith("/languages")) return { ok: true, status: 200, json: async () => libreLangs(["en", "ar"]) };
      if (url.endsWith("/detect")) return { ok: true, status: 200, json: async () => [{ language: "en" }] };
      return new Promise(() => { }); // Libre hangs too
    };
    const { translateContent } = loadSvc({ libreUrl: "http://mock-libre:5000" });
    const result = await translateContent({ contentId: "g7", content: "hello", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(false);
    expect(["PROVIDER_TIMEOUT", "PROVIDER_FAILED", "PROVIDER_UNAVAILABLE"]).toContain(result.error);
  }, 45000);

  test("recovery: after Libre failure, gtx serves; once Libre recovers, primary is used again", async () => {
    process.env.TRANSLATION_PRIMARY_RETRY_MS = "50"; // short window for the test
    let healthy = false;
    mockHandler = (url) => {
      if (isGtx(url)) return { status: 200, text: gtxJson("gtx-recovered", "en") };
      if (url.endsWith("/languages")) return { ok: true, status: 200, json: async () => libreLangs(["en", "ar"]) };
      if (url.endsWith("/detect")) return { ok: true, status: 200, json: async () => [{ language: "en" }] };
      if (!healthy) return { ok: true, status: 200, json: async () => ({ broken: 1 }) };
      return { ok: true, status: 200, json: async () => ({ translatedText: "libre-recovered" }) };
    };
    const { translateContent } = loadSvc({ libreUrl: "http://mock-libre:5000" });
    const first = await translateContent({ contentId: "rec1", content: "hello", targetLang: "ar", userId: "u1" });
    expect(first.ok).toBe(true); // served via gtx
    healthy = true;
    const second = await translateContent({ contentId: "rec2", content: "another", targetLang: "ar", userId: "u1" });
    expect(second.ok).toBe(true);
    expect(second.translatedText).toBe("libre-recovered"); // primary used again
  });

  test("cache hit: identical call served once; edited content invalidates via hash", async () => {
    let calls = 0;
    mockHandler = (url) => {
      if (isGtx(url)) { calls++; return { status: 200, text: gtxJson("cache-" + calls, "en") }; }
      return { status: 500, text: "{}" };
    };
    const { translateContent } = loadSvc();
    const a = await translateContent({ contentId: "c1", content: "hello", targetLang: "ar", userId: "u1" });
    const b = await translateContent({ contentId: "c1", content: "hello", targetLang: "ar", userId: "u1" });
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.translatedText).toBe(a.translatedText);
    const edited = await translateContent({ contentId: "c1", content: "hello edited", targetLang: "ar", userId: "u1" });
    expect(edited.cached).toBe(false);
  });

  test("HTML structure + links preserved end-to-end (gtx path)", async () => {
    mockHandler = (url) => {
      if (isGtx(url)) {
        // plain text segments arrive; return a plausible translation
        if (/tl=ar/.test(url)) return { status: 200, text: gtxJson("نص مترجم", "en") };
        return { status: 200, text: gtxJson("x", "en") };
      }
      return { status: 500, text: "{}" };
    };
    const { translateContent } = loadSvc();
    const result = await translateContent({
      contentId: "h9",
      content: '<p>Welcome <a href="https://example.com/page">here</a></p>',
      targetLang: "ar",
      userId: "u1",
    });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toContain("<p>");
    expect(result.translatedText).toContain('href="https://example.com/page"');
  });

  test("rate limit: 60 requests per user per window enforced (error surfaced, not silent)", async () => {
    mockHandler = (url) => (isGtx(url) ? { status: 200, text: gtxJson("x", "en") } : { status: 500, text: "{}" });
    const { translateContent } = loadSvc();
    let last;
    for (let i = 0; i < 61; i++) {
      last = await translateContent({ contentId: "rl" + i, content: "t" + i, targetLang: "ar", userId: "flood" });
    }
    expect(last.error).toBe("RATE_LIMITED");
  });

  test("empty content → EMPTY; oversized → TOO_LONG; unsupported target rejected", async () => {
    mockHandler = (url) => (isGtx(url) ? { status: 200, text: gtxJson("x", "en") } : { status: 500, text: "{}" });
    const { translateContent } = loadSvc();
    const empty = await translateContent({ contentId: "e1", content: "<p></p>", targetLang: "ar", userId: "u1" });
    expect(empty.error).toBe("EMPTY");
    const big = await translateContent({ contentId: "e2", content: "a".repeat(6000), targetLang: "ar", userId: "u1" });
    expect(big.error).toBe("TOO_LONG");
    const unsup = await translateContent({ contentId: "e3", content: "hello", targetLang: "xx", userId: "u1" });
    expect(unsup.error).toBe("MISSING_PARAMS"); // not in SUPPORTED_LANGUAGES
  });

  test("provider info exposes fallback state without secrets", async () => {
    const { getProviderInfo } = loadSvc();
    const info = getProviderInfo();
    expect(info.fallbackEnabled).toBe(true);
    expect(JSON.stringify(info)).not.toMatch(/api_key|apiKey|secret|token/i);
  });
});
