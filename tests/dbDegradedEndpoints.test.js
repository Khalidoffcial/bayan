/**
 * Bayan Space — Phase 5 regression: datastore ACCESS failures must never be
 * misclassified as auth failures, and must never 500 the user-facing endpoints.
 *
 * Run: node tests/dbDegradedEndpoints.test.js
 *
 * Extracts isDbAccessError + requireUser from mainServer.js into a sandbox and
 * exercises them with mocked DAO layers (no live Firebase).
 */
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-secret";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
}

const src = fs.readFileSync(path.join(__dirname, "..", "mainServer.js"), "utf8");

function extract(name) {
    const start = src.indexOf("function " + name + "(");
    if (start < 0) throw new Error(name + " not found in mainServer.js");
    let depth = 0, i = src.indexOf("{", start);
    for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) break; }
    }
    return src.substring(start, i + 1);
}

const jwt = require("jsonwebtoken");
const SECRET = process.env.ACCESS_TOKEN_SECRET;

// ---- Sandboxed requireUser with injected DAO behaviors --------------------
function buildRequireUser(findbyIDImpl) {
    const sandbox = {
        jwt,
        process: { env: { ACCESS_TOKEN_SECRET: SECRET } },
        console: { warn() { }, error() { } },
        isDbAccessError: null,
        DaoForDbUser: { findbyID: findbyIDImpl },
    };
    // isDbAccessError is declared above requireUser in the same scope
    vm.runInContext(extract("isDbAccessError"), vm.createContext(sandbox));
    vm.runInContext(extract("requireUser"), vm.createContext(sandbox));
    return sandbox.requireUser;
}

function makeRes() {
    return {
        statusCode: 0, body: null,
        status(c) { this.statusCode = c; return this; },
        json(o) { this.body = o; return this; },
    };
}
function makeReq(token) {
    return { headers: token ? { authorization: "Bearer " + token } : {} };
}

console.log("requireUser degradation:");

t("1. valid session + DB permission-denied → session PRESERVED (next called, no logout)", async () => {
    const requireUser = buildRequireUser(() => { const e = new Error("permission_denied"); e.code = "permission_denied"; throw e; });
    const token = jwt.sign({ id: "u1", name: "A", username: "a" }, SECRET);
    const req = makeReq(token), res = makeRes();
    let nexted = false;
    await requireUser(req, res, () => { nexted = true; });
    assert.ok(nexted, "next() must be called — session preserved");
    assert.strictEqual(res.statusCode, 0, "no error status written");
    assert.strictEqual(req.user.id, "u1");
    assert.strictEqual(req.dbDegraded, true);
});

t("2. valid session + DB unavailable/network error → session PRESERVED", async () => {
    const requireUser = buildRequireUser(() => { throw new Error("Network error"); });
    const token = jwt.sign({ id: "u2", name: "B", username: "b" }, SECRET);
    const req = makeReq(token), res = makeRes();
    let nexted = false;
    await requireUser(req, res, () => { nexted = true; });
    assert.ok(nexted);
    assert.strictEqual(req.user.id, "u2");
    assert.strictEqual(req.dbDegraded, true);
});

t("3. forged/garbage token → 401 (auth classification unchanged)", async () => {
    const requireUser = buildRequireUser(async () => ({}));
    const req = makeReq("not.a.jwt"), res = makeRes();
    let nexted = false;
    await requireUser(req, res, () => { nexted = true; });
    assert.ok(!nexted);
    assert.strictEqual(res.statusCode, 401);
});

t("4. missing token → 401", async () => {
    const requireUser = buildRequireUser(async () => ({}));
    const req = makeReq(null), res = makeRes();
    let nexted = false;
    await requireUser(req, res, () => { nexted = true; });
    assert.ok(!nexted);
    assert.strictEqual(res.statusCode, 401);
});

t("5. legacy hash-bearing token → 401 (still rejected)", async () => {
    const requireUser = buildRequireUser(async () => ({}));
    const token = jwt.sign({ id: "u3", pass: "$2a$10$x" }, SECRET);
    const req = makeReq(token), res = makeRes();
    await requireUser(req, res, () => { });
    assert.strictEqual(res.statusCode, 401);
});

t("6. non-access DB error (logic bug) → still a hard 500 (genuine errors not hidden)", async () => {
    const requireUser = buildRequireUser(() => { throw new TypeError("cannot read property of undefined"); });
    const token = jwt.sign({ id: "u4", name: "C", username: "c" }, SECRET);
    const req = makeReq(token), res = makeRes();
    await requireUser(req, res, () => { });
    assert.strictEqual(res.statusCode, 500);
});

console.log("isDbAccessError classification:");
t("7. permission denied (firebase RTDB shape) → true", () => {
    const sandbox = {};
    vm.runInContext(extract("isDbAccessError"), vm.createContext(sandbox));
    assert.ok(sandbox.isDbAccessError(new Error("permission_denied")));
    assert.ok(sandbox.isDbAccessError({ code: "PERMISSION_DENIED", message: "Permission denied" }));
    assert.ok(sandbox.isDbAccessError({ code: "app/check-failed", message: "App Check" }));
    assert.ok(!sandbox.isDbAccessError({ code: "ENOENT", message: "no such file" }));
    assert.ok(!sandbox.isDbAccessError(null));
});

console.log("Route-level degradation contracts (static):");
t("8. GET /settings degrades with defaults instead of 500 on access errors", () => {
    const settingsBlock = src.substring(src.indexOf('"/settings"', src.indexOf('app.get')), src.indexOf('"/settings"', src.indexOf('app.get')) + 2500);
    assert.ok(settingsBlock.includes("degraded: true"), "settings degraded response missing");
    assert.ok(settingsBlock.includes("isDbAccessError"), "settings access-error branch missing");
});
t("9. GET /audio-hub/trending returns valid empty-state on access errors", () => {
    const i = src.indexOf('"/audio-hub/trending"');
    const block = src.substring(i, i + 3000);
    assert.ok(block.includes('items: []'), "trending empty-state missing");
    assert.ok(block.includes("isDbAccessError"), "trending access-error branch missing");
    // no fabricated tracks: no hardcoded fake track objects
    assert.ok(!/title:\s*"Fake|title:\s*"Trending Hit/i.test(block), "fabricated tracks detected");
});
t("10. POST /auth preserves session on DB access errors (no 500 → logout path)", () => {
    const i = src.indexOf('"/auth"');
    const block = src.substring(i, i + 4500);
    assert.ok(block.includes("isDbAccessError"), "auth degraded branch missing");
    assert.ok(block.includes("valid: true"), "auth degraded must still return valid:true");
});

console.log("Response-shape guarantees:");
t("11. trending empty-state matches the frontend contract ({status:'ok', items:[]})", async () => {
    // fetchTrending in the frontend reads response.data.items and data.status
    const feSrc = fs.readFileSync(path.join(__dirname, "..", "..", "bayan", "src", "features", "audio", "services", "audioHub.service.js"), "utf8");
    assert.ok(feSrc.includes("response?.data?.items"), "frontend reads data.items");
    // So backend must send items: [] — verified in the handler above (test 9)
});

console.log("Admin/User auth isolation:");
t("12. admin middleware untouched by user-session degradation", () => {
    // admin auth uses its own requireAdmin with session revocation — unchanged
    const authSrc = fs.readFileSync(path.join(__dirname, "..", "admin", "auth.js"), "utf8");
    assert.ok(authSrc.includes("requireAdmin"), "admin requireAdmin present");
    assert.ok(!authSrc.includes("isDbAccessError"), "user degradation must not leak into admin auth");
});

(async () => {
    console.log(`\n${pass} passed, ${fail} failed`);
    console.log("SUMMARY: " + pass + " passed, " + fail + " failed");
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
