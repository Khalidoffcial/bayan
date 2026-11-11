/** Catch the actual thrown error: instrument via overriding console? No —
 *  patch Error.captureStackTrace? Simplest: wrap translateContent call in a
 *  custom mock where gtx branch records. Better: add temporary debug env:
 *  TRANSLATION_DEBUG — no. Direct: replicate g6 with a spy on the failover:
 *  make gtx respond with DISTINCT text "SHOULD-NOT" and assert. Then read
 *  the received error text again with full JSON. */
process.env.NODE_ENV = "test";
let handler = null;
const mockFetch = jest.fn(async (url, opts) => {
  const res = await mockHandler(String(url), opts?.body ? JSON.parse(opts.body) : null, opts);
  if (res instanceof Promise) { await res; return {}; }
  return {
    ok: res.ok ?? true, status: res.status ?? 200,
    text: async () => res.text ?? JSON.stringify(res.json),
    json: async () => res.json,
  };
});
let mockHandler = null;
jest.mock("node-fetch", () => mockFetch);

test("deep g6", async () => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = "http://mock-libre:5000";
  delete process.env.LIBRETRANSLATE_API_KEY;
  process.env.TRANSLATION_GTX_ENABLED = "1";
  const svc = require("../service/translation.service.js");
  // expose internals? Not exported. Instead force failure modes:
  // make Libre's /detect ALSO 429 — earlier /detect mock returned ok. If
  // /detect 429 → libreCall throws RATE_LIMITED inside detectContent's try
  // → caught → returns null (harmless). So detection is fine.
  handler = async (u) => {
    if (u.includes("translate.googleapis.com")) return { status: 200, text: JSON.stringify([[["gtx"], null, "en"]]) };
    if (u.endsWith("/languages")) return { ok: true, status: 200, json: [{ code: "en" }, { code: "ar" }] };
    if (u.endsWith("/detect")) return { ok: true, status: 200, json: [{ language: "en", confidence: 99 }] };
    return { ok: false, status: 429, json: { error: "rate" } };
  };
  const r = await svc.translateContent({ contentId: "x", content: "hello", targetLang: "ar", userId: "u1" });
  console.log("R:", JSON.stringify(r));
  // Now the KEY test: is RATE_LIMITED mapped in the outer catch? print mapping
});
