/** Now routed through node-fetch (mocked) — why still failing? Trace g2. */
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

test("g2 trace", async () => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = "";
  delete process.env.LIBRETRANSLATE_API_KEY;
  process.env.TRANSLATION_GTX_ENABLED = "1";
  const svc = require("../service/translation.service.js");
  handler = async (u) => {
    process.stderr.write("CALL " + u.slice(0, 90) + "\n");
    if (u.includes("translate.googleapis.com")) return { status: 200, text: JSON.stringify([[["مرحبا"], null, "en"]]) };
    return { status: 500, text: "{}" };
  };
  const r = await svc.translateContent({ contentId: "g2", content: "hello", targetLang: "ar", userId: "u1" });
  console.log("R:", JSON.stringify(r));
});
