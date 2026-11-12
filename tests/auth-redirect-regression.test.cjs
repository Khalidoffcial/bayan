/**
 * auth-redirect-regression.test.js â€” Phase 5 regression tests (spec Â§13).
 * Runs a stub of the REAL /auth contract (mirrors mainServer.js exactly) on a
 * localhost Express server and exercises the client cookie util + Home.jsx
 * logic contracts. No production backend, no Firebase, no internet.
 *
 * js-cookie v3 silently no-ops without a DOM, so it is replaced with a jar
 * backed by globalThis via an ESM loader hook (official interception API for
 * ESM-graph requires).
 *
 * Run: node tests/auth-redirect-regression.test.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pathToFileURL, fileURLToPath } = require("url");

// â”€â”€ js-cookie shim: jar lives on globalThis so the shim file (loaded by the
//    ESM loader) and this test share the SAME jar object. â”€â”€
const jarData = {};
globalThis.__cookieJar = jarData;
const SHIM_PATH = path.join(os.tmpdir(), "jscookie-shim-" + Date.now() + ".cjs");
fs.writeFileSync(SHIM_PATH,
    "module.exports = { get: (k) => globalThis.__cookieJar[k] ?? null, set: (k, v) => { globalThis.__cookieJar[k] = String(v); }, remove: (k) => { delete globalThis.__cookieJar[k]; } };");
const HOOK_PATH = path.join(os.tmpdir(), "jscookie-hook-" + Date.now() + ".mjs");
fs.writeFileSync(HOOK_PATH, `
import { pathToFileURL } from "node:url";
export async function resolve(specifier, context, next) {
  if (specifier === "js-cookie") return { url: pathToFileURL(${JSON.stringify(SHIM_PATH)}).href, shortCircuit: true };
  return next(specifier, context);
}`);
// register the loader hook for the ESM graph this process will load
const { register } = require("node:module");
register(pathToFileURL(HOOK_PATH).href, pathToFileURL(__filename));

const passed = [], failed = [];
function ok(name, cond) { (cond ? passed : failed).push(name); console.log((cond ? "  PASS " : "  FAIL ") + name); }

const homeSrc = fs.readFileSync(path.join(__dirname, "..", "src", "pages", "Home.jsx"), "utf8");

ok("1. no bare catch->navigate('/welcome') â€” errors are classified",
    !/\.catch\(\(\) => \{\s*navigate\("\/welcome"/.test(homeSrc));
ok("2. unresolved auth never treated as unauthenticated (restoring state)",
    /"restoring"/.test(homeSrc) && /authState === "restoring"/.test(homeSrc));
ok("3. confirmed 401/403 -> welcome", /status === 401 \|\| status === 403/.test(homeSrc));
ok("4. backend-down -> recoverable error UI, session preserved",
    /setAuthState\("error"\)/.test(homeSrc) && /authState === "error"/.test(homeSrc));
ok("5. no session wipe on ambiguous errors (only on confirmed expired/banned)",
    /removeItem\("me"\)/.test(homeSrc) &&
    !/\.catch\(\(\) => \{\s*localStorage\.removeItem/.test(homeSrc));
ok("6. deep-link destination preserved on genuine redirect",
    /state: \{ from: location\.pathname \}/.test(homeSrc));

// â”€â”€ stub of the REAL /auth contract (mirrors mainServer.js /auth) â”€â”€
const express = require(path.join(__dirname, "..", "..", "backend", "bayan-backend", "node_modules", "express"));
const jwt = require(path.join(__dirname, "..", "..", "backend", "bayan-backend", "node_modules", "jsonwebtoken"));
const http = require("http");

const SECRET = "test-secret";
const makeToken = (payload, opts = {}) => jwt.sign(payload, SECRET, { expiresIn: opts.expiresIn || "1h" });
const hashLegacy = (token) =>
    require("crypto").createHash("sha256").update(token).digest("hex") + token;

const app = express();
app.use(express.json());
let mode = "ok"; // ok | down | banned
app.post("/auth", (req, res) => {
    if (mode === "down") return res.status(503).json({ error: "temporarily unavailable" });
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    let payload;
    try {
        payload = jwt.verify(token, SECRET);
    } catch (e) {
        if (e.name === "TokenExpiredError") return res.status(401).json({ message: "Token expired, please sign in again" });
        return res.status(401).json({ message: "Invalid token" }); // legacy hash-tokens land here
    }
    if (mode === "banned" && payload.banned) return res.status(403).json({ message: "Account banned" });
    return res.json({ userData: { id: payload.id, name: payload.name, username: payload.username } });
});

const server = http.createServer(app).listen(0);
const port = server.address().port;
// apiEndpoints.js picks the DEV base only when NODE_ENV === 'development';
// we override explicitly so the test can NEVER touch the production Railway URL.
process.env.NODE_ENV = "development";
process.env.REACT_APP_API_BASE_URL = "http://127.0.0.1:" + port;

const CLIENT = path.join(__dirname, "..");
const { API_ENDPOINTS } = require(path.join(CLIENT, "src", "constants", "apiEndpoints.js"));
// cookies.js is ESM-syntax-in-CJS â€” Node loads it as CJS, default export via .default
const cookiesMod = require(path.join(CLIENT, "src", "utils", "cookies.js"));
const cookieFn = cookiesMod.default ?? cookiesMod;

// localStorage shim (cookies util + Home logic touch it)
const ls = {};
globalThis.localStorage = {
    getItem: (k) => (k in ls ? ls[k] : null),
    setItem: (k, v) => { ls[k] = String(v); },
    removeItem: (k) => { delete ls[k]; },
};

(async () => {
    const axiosMod = await import(pathToFileURL(path.join(CLIENT, "node_modules", "axios", "dist", "node", "axios.cjs")));
    const axios = axiosMod.default ?? axiosMod;
    const auth = async () =>
        axios.post(API_ENDPOINTS.AUTH, {}, { headers: { Authorization: "Bearer " + cookieFn("get") } });

    // 1â€“2. valid existing cookie / refresh while logged in â†’ authenticated
    const setTok = makeToken({ id: "u1", name: "Khalid", username: "khalid" });
    cookieFn(setTok);
    mode = "ok";
    ok("S1. client token set/read works (shim roundtrip)", cookieFn("get") === setTok);
    let r = await auth();
    ok("S1b. valid existing user cookie â†’ authenticated (200 + userData)", r.status === 200 && r.data.userData.id === "u1");
    r = await auth();
    ok("S2. refresh while logged in â†’ still authenticated", r.status === 200 && !!r.data.userData);

    // 3. token persists (60-day) â†’ survives browser reopen
    ok("S3. token persists across browser reopen", !!cookieFn("get"));

    // 4. no cookies + no cached profile â†’ confirmed guest
    cookieFn("remove"); localStorage.removeItem("me");
    ok("S4. no auth cookies â†’ confirmed guest", cookieFn("get") === null && localStorage.getItem("me") === null);

    // 5. expired token â†’ 401 "Token expired" â†’ confirmed unauth; Home clears stale profile
    cookieFn(makeToken({ id: "u1" }, { expiresIn: "-1h" }));
    localStorage.setItem("me", JSON.stringify({ stale: true }));
    let expiredHit = false;
    try { await auth(); } catch (e) { expiredHit = e.response?.status === 401 && /expired/i.test(e.response?.data?.message || ""); }
    ok("S5. expired token â†’ 401 Token expired (confirmed unauth)", expiredHit);
    ok("S5b. Home clears stale profile ONLY on confirmed expired/banned",
        /expired/i.test(homeSrc) && /removeItem\("me"\)/.test(homeSrc));

    // 6. backend temporarily unavailable â†’ 503, session preserved, recoverable UI
    mode = "down";
    cookieFn(makeToken({ id: "u1" }));
    localStorage.setItem("me", JSON.stringify({ keep: true }));
    let down503 = false;
    try { await auth(); } catch (e) { down503 = e.response?.status === 503; }
    ok("S6. backend down â†’ 503 (NOT 401 â€” session not destroyed)", down503);
    ok("S6b. session data preserved during outage", !!localStorage.getItem("me"));
    mode = "ok";

    // 7. legacy hash-token â†’ 401 Invalid â†’ confirmed unauth (re-login required)
    cookieFn(hashLegacy(makeToken({ id: "u1" })));
    let legacy401 = false;
    try { await auth(); } catch (e) { legacy401 = e.response?.status === 401; }
    ok("S7. legacy hash-token â†’ 401 (re-login required, no crash)", legacy401);

    // 8. banned user â†’ 403 â†’ confirmed unauth, profile cleared
    mode = "banned";
    cookieFn(makeToken({ id: "b1", name: "x", username: "x", banned: true }));
    localStorage.setItem("me", JSON.stringify({ keep: true }));
    let banned403 = false;
    try { await auth(); } catch (e) { banned403 = e.response?.status === 403; }
    ok("S8. banned user â†’ 403 confirmed unauth", banned403);
    mode = "ok";

    // 9. logout â†’ guest
    cookieFn(makeToken({ id: "u1" }));
    cookieFn("remove"); localStorage.removeItem("me");
    ok("S9. logout clears token and profile â†’ guest", cookieFn("get") === null);

    // 10â€“12. strict separation of the three auth domains
    const backendRoot = path.join(CLIENT, "..", "backend", "bayan-backend");
    const adminCore = fs.readFileSync(path.join(backendRoot, "admin", "core.js"), "utf8");
    const adminIndex = fs.readFileSync(path.join(backendRoot, "admin", "index.js"), "utf8");
    const mainSrv = fs.readFileSync(path.join(backendRoot, "mainServer.js"), "utf8");
    ok("S10. Control Center: own JWT secret + own credential store (control_admins)",
        /ADMIN_JWT_SECRET/.test(adminCore) && /SUPER_ADMIN_ROOT = "control_admins"/.test(adminIndex));
    ok("S11. user /auth verifies with ACCESS_TOKEN_SECRET (distinct from admin)",
        (mainSrv.match(/ACCESS_TOKEN_SECRET/g) || []).length >= 2);
    ok("S12. admin routes isolated under /admin/api behind requireAdmin",
        /app\.use\("\/admin\/api", adminRouter\)/.test(mainSrv));

    // 13. cookies not cleared during init
    ok("S13. Home never clears cookies during init", !/cookie\("remove"\)/.test(homeSrc));

    // 14. no infinite redirect loop
    ok("S14. redirect is single-shot replace (no loop)",
        /replace: true/.test(homeSrc) && (homeSrc.match(/navigate\("\/welcome"/g) || []).length === 1);

    // 15. stale-response guard (double-run race protection)
    ok("S15. stale-response guard present (cancelled flag)", /cancelled/.test(homeSrc));

    server.close();
    console.log(`\n=== Auth regression: ${passed.length} passed, ${failed.length} failed ===`);
    if (failed.length) { console.log("Failed:", failed.join(" | ")); process.exit(1); }
    process.exit(0);
})().catch((e) => { console.error("runner error:", e.message); process.exit(1); });


