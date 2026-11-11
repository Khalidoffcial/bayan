/** g2 with a piecewise gtx mock: inspect each gtxCall URL param */
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

test("g2 piecewise", async () => {
  jest.resetModules();
  process.env.LIBRETRANSLATE_URL = "";
  delete process.env.LIBRETRANSLATE_API_KEY;
  process.env.TRANSLATION_GTX_ENABLED = "1";
  const svc = require("../service/translation.service.js");
  handler = async (u) => {
    if (u.includes("translate.googleapis.com")) {
      const q = decodeURIComponent(u.split("&q=")[1] || "");
      process.stderr.write("Q: " + JSON.stringify(q) + "\n");
      return { status: 200, text: JSON.stringify([[["X:" + q.slice(0, 10)], null, "en"]]) };
    }
    process.stderr.write("OTHER " + u.slice(0, 50) + "\n");
    return { status: 500, text: "{}" };
  };
  const r = await svc.translateContent({ contentId: "g2", content: "hello", targetLang: "ar", userId: "u1" });
  console.log("R:", JSON.stringify(r));
});
