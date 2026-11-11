/** Isolated g6: user u1, Libre 429 on /translate, gtx mock returns 200.
 *  Expect RATE_LIMITED; observed PROVIDER_FAILED. Print every fetch + the
 *  thrown error by wrapping the service via monkeypatch on console? Better:
 *  patch global Error capture in the mock handler. */
process.env.NODE_ENV = "test";
let handler = null;
const calls = [];
const mockFetch = jest.fn(async (url, opts) => {
  const res = await mockHandler(String(url), opts?.body ? JSON.parse(opts.body) : null, opts);
  calls.push({ url: String(url).slice(0, 60), status: res?.status, body: opts?.body?.slice(0, 60) });
  if (res instanceof Error) { calls.push({ threw: res.message }); throw res; }
  if (res instanceof Promise) { await res; return {}; }
  return {
    ok: res.ok ?? true, status: res.status ?? 200,
    text: async () => res.text ?? JSON.stringify(res.json),
    json: async () => res.json,
  };
});
let mockHandler = null;
jest.mock("node-fetch", () => mockFetch);

test("g6 isolated", async () => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = "http://mock-libre:5000";
  delete process.env.LIBRETRANSLATE_API_KEY;
  process.env.TRANSLATION_GTX_ENABLED = "1";
  delete process.env.TRANSLATION_PRIMARY_RETRY_MS;
  const { translateContent } = require("../service/translation.service.js");
  handler = async (u) => {
    if (u.includes("translate.googleapis.com")) return { status: 200, text: JSON.stringify([[["should-not-happen"], null, "en"]]) };
    if (u.endsWith("/languages")) return { ok: true, status: 200, json: [{ code: "en" }, { code: "ar" }] };
    if (u.endsWith("/detect")) return { ok: true, status: 200, json: [{ language: "en", confidence: 99 }] };
    return { ok: false, status: 429, json: { error: "rate" } };
  };
  const r = await translateContent({ contentId: "g6", content: "hello", targetLang: "ar", userId: "u1" });
  console.log("RESULT:", JSON.stringify(r));
  console.log("CALLS:", JSON.stringify(calls, null, 1));
});
