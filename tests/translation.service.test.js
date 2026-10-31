/**
 * Translation service unit tests — no real provider calls.
 */
process.env.NODE_ENV = "test";

// Mock the provider so tests never hit Google Translate.
jest.mock("@vitalets/google-translate-api", () => ({
  translate: jest.fn(async (text, opts) => ({
    text: `[${opts?.to || "en"}] ${text}`,
    from: { language: { iso: /[\u0600-\u06FF]/.test(text) ? "ar" : "en" } },
  })),
}));

const { translateContent, getProviderInfo } = require("../service/translation.service.js");

describe("translation.service", () => {
  test("provider info exposes limits and supported languages (no secrets)", () => {
    const info = getProviderInfo();
    expect(info.supportedLanguages).toContain("en");
    expect(info.supportedLanguages).toContain("ar");
    expect(info.maxTextLength).toBeGreaterThan(0);
    expect(JSON.stringify(info)).not.toMatch(/apiKey|api_key|secret|token/i);
  });

  test("rejects missing/invalid params", async () => {
    expect((await translateContent({})).ok).toBe(false);
    expect((await translateContent({ contentId: "1", content: "hi", targetLang: "xx", userId: "u" })).error).toBe("MISSING_PARAMS");
  });

  test("rejects content over the size limit", async () => {
    const long = "a".repeat(6000);
    const result = await translateContent({
      contentId: "p1", content: long, targetLang: "en", userId: "u1",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("TOO_LONG");
  });

  test("translates Arabic content to English and preserves HTML structure", async () => {
    const result = await translateContent({
      contentId: "p1",
      content: "<p>مرحبا بالعالم</p><p>سطر آخر</p>",
      contentVersion: "1",
      targetLang: "en",
      userId: "u1",
    });
    expect(result.ok).toBe(true);
    expect(result.sourceLang).toBe("ar");
    // Structural tags preserved — translated segments wrapped in same <p> tags
    expect(result.translatedText).toMatch(/<p>/);
    expect(result.translatedText).toContain("[en] ");
    expect(result.cached).toBe(false);
  });

  test("second call for same content/version/lang is served from cache", async () => {
    const input = {
      contentId: "cache-1",
      content: "نص عربي للكاش",
      contentVersion: "5",
      targetLang: "en",
      userId: "u1",
    };
    const first = await translateContent(input);
    const second = await translateContent(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.cached).toBe(true);
    expect(second.translatedText).toBe(first.translatedText);
  });

  test("edited content (new version) does NOT reuse the stale cache entry", async () => {
    const base = { contentId: "versioned-1", targetLang: "en", userId: "u1" };
    const v1 = await translateContent({ ...base, content: "النسخة الأولى", contentVersion: "1" });
    const v2 = await translateContent({ ...base, content: "النسخة الثانية المعدلة", contentVersion: "2" });
    expect(v1.ok).toBe(true);
    expect(v2.ok).toBe(true);
    expect(v2.cached).toBe(false);
    expect(v2.translatedText).not.toBe(v1.translatedText);
  });

  test("RATE_LIMITED after too many requests from one user", async () => {
    for (let i = 0; i < 60; i++) {
      await translateContent({
        contentId: `rate-${i}`, content: "نص", targetLang: "en", userId: "rate-user",
      });
    }
    const blocked = await translateContent({
      contentId: "rate-over", content: "نص", targetLang: "en", userId: "rate-user",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toBe("RATE_LIMITED");
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  test("URLs are preserved through translation (not translated/broken)", async () => {
    const result = await translateContent({
      contentId: "url-1",
      content: "<p>زيارة https://example.com/page?a=1&b=2 للمزيد</p>",
      contentVersion: "1",
      targetLang: "en",
      userId: "u1",
    });
    expect(result.ok).toBe(true);
    expect(result.translatedText).toContain("https://example.com/page?a=1&b=2");
  });
});
