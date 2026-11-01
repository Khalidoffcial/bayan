/**
 * LibreTranslate provider tests — النسخة النهائية النظيفة.
 */
process.env.NODE_ENV = "test";

let mockHandler = null;
const mockLibreFetch = jest.fn(async (url, opts) => {
  if (!mockHandler) throw new Error("handler not set");
  const rawBody = JSON.parse(opts?.body || "{}");
  const res = mockHandler(String(url), rawBody);
  return { ...res, json: async () => res.json(rawBody) };
});

jest.mock("node-fetch", () => mockLibreFetch);

const svcPath = "../service/translation.service.js";

const loadSvc = () => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = "http://mock-libre:5000";
  delete process.env.LIBRETRANSLATE_API_KEY;
  return require(svcPath);
};

const langs = (codes) => ({ ok: true, status: 200, json: async () => codes.map((c) => ({ code: c })) });
const detect = (lang) => ({ ok: true, status: 200, json: async () => [{ language: lang, confidence: 90 }] });
const tr = (prefix) => ({ ok: true, status: 200, json: async (body) => ({ translatedText: `${prefix} ${body.q}` }) });

beforeEach(() => {
  mockHandler = (url) => {
    if (url.endsWith("/languages")) return langs(["en", "ar", "fr"]);
    if (url.endsWith("/detect")) return detect("en");
    return tr("[x]");
  };
});

afterEach(() => {
  mockHandler = null;
  mockLibreFetch.mockClear();
});

describe("LibreTranslate provider", () => {
  test("PROVIDER_UNAVAILABLE when LIBRETRANSLATE_URL is empty", async () => {
    jest.resetModules();
    process.env.LIBRETRANSLATE_URL = "";
    delete process.env.LIBRETRANSLATE_API_KEY;
    const { translateContent } = require(svcPath);
    const result = await translateContent({ contentId: "t1", content: "hello", targetLang: "ar", userId: "u" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("PROVIDER_UNAVAILABLE");
  });

  test("successful Arabic→English preserves HTML structure", async () => {
    mockHandler = (url) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return detect("ar");
      return tr("[en]");
    };
    const { translateContent } = loadSvc();
    const result = await translateContent({
      contentId: "h1", content: "<p>مرحبا</p><p>عالم</p>", targetLang: "en", userId: "u1",
    });
    expect(result.ok).toBe(true);
    expect(result.sourceLang).toBe("ar");
    expect(result.translatedText).toMatch(/<p>/);
  });

  test("translation succeeds even when /detect fails (source: auto)", async () => {
    mockHandler = (url) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return { ok: false, status: 500, json: async () => ({ error: "down" }) };
      return tr("[x]");
    };
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "d1", content: "hello", targetLang: "ar", userId: "u1" });
    expect(result.ok).toBe(true);
    expect(result.sourceLang).toBe("unknown");
  });

  test("cache: second identical call served from cache (1 real provider call)", async () => {
    let realCalls = 0;
    mockHandler = (url, body) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return detect("en");
      if (body?.q === "ok") return tr("[boot]");
      realCalls++;
      return tr(`[c${realCalls}]`);
    };
    const { translateContent } = loadSvc();
    const input = { contentId: "c9", content: "hello world", targetLang: "ar", userId: "u1" };
    const first = await translateContent(input);
    const second = await translateContent(input);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.translatedText).toBe(first.translatedText);
    expect(realCalls).toBe(1);
  });

  test("edited content (same contentId) bypasses stale cache via text hash", async () => {
    mockHandler = (url) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return detect("en");
      return tr("[v]");
    };
    const { translateContent } = loadSvc();
    const v1 = await translateContent({ contentId: "e1", content: "first text", targetLang: "ar", userId: "u1" });
    const v2 = await translateContent({ contentId: "e1", content: "second edited text", targetLang: "ar", userId: "u1" });
    expect(v1.translatedText).not.toBe(v2.translatedText);
  });

  test("SAME_LANGUAGE when detected source == target", async () => {
    mockHandler = (url) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return detect("ar");
      return tr("x");
    };
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "s1", content: "نص عربي", targetLang: "ar", userId: "u1" });
    expect(result.error).toBe("SAME_LANGUAGE");
  });

  test("RATE_LIMITED after exceeding user quota", async () => {
    mockHandler = (url) => {
      if (url.endsWith("/languages")) return langs(["en", "ar"]);
      if (url.endsWith("/detect")) return detect("ar");
      return tr("[x]");
    };
    const { translateContent } = loadSvc();
    for (let i = 0; i < 60; i++) {
      await translateContent({ contentId: `r-${i}`, content: "نص عربي", targetLang: "en", userId: "rate-user" });
    }
    const blocked = await translateContent({ contentId: "r-end", content: "نص عربي", targetLang: "en", userId: "rate-user" });
    expect(blocked.error).toBe("RATE_LIMITED");
  });

  test("provider connection failure → PROVIDER_UNAVAILABLE", async () => {
    mockHandler = () => { throw new Error("ECONNREFUSED"); };
    const { translateContent } = loadSvc();
    const result = await translateContent({ contentId: "f1", content: "hello", targetLang: "ar", userId: "u1" });
    expect(["PROVIDER_UNAVAILABLE", "PROVIDER_FAILED"]).toContain(result.error);
  });

  test("provider info exposes LibreTranslate name without secrets", async () => {
    const { getProviderInfo } = loadSvc();
    const info = getProviderInfo();
    expect(info.name).toMatch(/LibreTranslate/i);
    expect(JSON.stringify(info)).not.toMatch(/api_key|apiKey|secret/i);
  });

  test("content over the size limit is rejected", async () => {
    const { translateContent } = loadSvc();
    const result = await translateContent({
      contentId: "long", content: "a".repeat(6000), targetLang: "ar", userId: "u1",
    });
    expect(result.error).toBe("TOO_LONG");
  });
});
