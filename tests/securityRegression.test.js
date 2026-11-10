/**
 * Bayan Space — Phase 1 security regression tests (standalone, no Firebase).
 * Deployed to backend/tests/securityRegression.test.js
 * Run: node tests/securityRegression.test.js
 *
 * Covers:
 *  1. JWT payloads carry NO password/hash.
 *  2. Legacy tokens (with `pass`) are rejected by requireUser (static check).
 *  3. Socket auth: invalid/legacy token → guest (no identity) (static check).
 *  4. sanitizeInterests allowlist.
 *  5. rateOK limiter boundaries.
 *  6. buildUserData never exposes psw/pass.
 *  7. Admin auth: requireAdmin fail-closed, session revocation, RBAC gate.
 *  8. deepSanitize strips secrets anywhere in payloads/responses.
 */
process.env.ADMIN_JWT_SECRET = "test-admin-secret";
process.env.ADMIN_AUDIT_SALT = "test-salt";
const assert = require("assert");
const jwt = require("jsonwebtoken");
let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
}

const fs = require("fs");
const path = require("path");
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
const vm = require("vm");
const ctx = vm.createContext({ require, console, process, Map, sockBuckets: new Map() });
vm.runInContext([
    extract("tokenPayloadFromUser"),
    extract("buildUserData"),
    extract("sanitizeInterests"),
    extract("rateOK"),
].join("\n"), ctx);

console.log("JWT payload hygiene:");
t("tokenPayloadFromUser has only id/name/username", () => {
    const p = ctx.tokenPayloadFromUser({ Id_user: "123", F_user: "A", S_user: "b", psw: "$2a$10$HASH", email: "x@y.z" });
    assert.deepStrictEqual(Object.keys(p).sort(), ["id", "name", "username"]);
    assert.ok(!JSON.stringify(p).includes("HASH"));
});
t("buildUserData never exposes psw", () => {
    const d = ctx.buildUserData({ Id_user: "9", F_user: "N", S_user: "u", Bio: "b", psw: "$2a$10$SECRET" }, {});
    const s = JSON.stringify(d);
    assert.ok(!s.includes("$2a$10$SECRET"));
    assert.ok(d.id === "9" && d.name === "N");
});
t("no generateToken payload includes pass/psw (static scan)", () => {
    const genCalls = [...src.matchAll(/generateToken\(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(genCalls.length >= 3, "expected >=3 generateToken calls, got " + genCalls.length);
    for (const c of genCalls) {
        assert.ok(!/\bpsw\b|\bpass\b|\bpassword\b/.test(c), "token payload leaks secret: " + c.trim());
    }
});

console.log("Static route hardening:");
t("no route re-derives identity from hash (login_user(decoded.id, decoded.pass))", () => {
    assert.ok(!src.includes("login_user(decoded.id, decoded.pass)"));
});
t("requireUser rejects legacy hash-bearing tokens", () => {
    assert.ok(src.includes("decoded.pass !== undefined"), "legacy-token rejection missing");
    assert.ok(src.includes("Token expired, please sign in again"));
});
t("all user-facing POST routes use requireUser, not bare verifyToken", () => {
    // every app.post(..., X, ...) middleware occurrence must be requireUser
    const bad = [...src.matchAll(/app\.(post|get|put|delete)\("[^"]+",\s*verifyToken/g)];
    assert.strictEqual(bad.length, 0, "routes still on verifyToken: " + bad.map((m) => m[0]).join(", "));
    assert.ok(src.includes("app.post(\"/saveposts\", requireUser"));
    assert.ok(src.includes("app.post(\"/getuser\", requireUser"));
    assert.ok(src.includes("app.post(\"/followingUser\", requireUser"));
    assert.ok(src.includes("app.post(\"/unfollowingUser\", requireUser"));
    assert.ok(src.includes("app.post(\"/editProfile\", requireUser"));
});
t("socket handlers ignore client userId and use handshake identity", () => {
    assert.ok(src.includes("io.use((socket, next)"));
    assert.ok(!src.includes("socket.handshake.query.userId"));
    assert.ok(src.includes("const userId = socket.userId || null;"));
});
t("suspension enforcement present on write routes", () => {
    const hits = (src.match(/Account suspended/g) || []).length;
    assert.ok(hits >= 5, "expected >=5 suspension guards, got " + hits);
});
t("no PII console.log in auth paths", () => {
    assert.ok(!/console\.log\(email\)|console\.log\(uid\)|console\.log\("User data:"/.test(src));
});

console.log("Socket helpers:");
t("sanitizeInterests allows only articles/novels string lists", () => {
    const ok = ctx.sanitizeInterests({ articles: ["history"], novels: [" "], evil: { a: 1 } });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(ok)), { articles: ["history"] });
    assert.strictEqual(ctx.sanitizeInterests({ articles: [123, {}] }), null);
    assert.strictEqual(ctx.sanitizeInterests(null), null);
    assert.strictEqual(ctx.sanitizeInterests({}), null);
});
t("sanitizeInterests bounds length and count", () => {
    const long = "x".repeat(200);
    const out = ctx.sanitizeInterests({ articles: Array.from({ length: 50 }, () => long) });
    assert.ok(out.articles.length <= 30 && out.articles[0].length <= 60);
});
t("rateOK: fixed window", () => {
    const key = "t:" + Math.random();
    for (let i = 0; i < 3; i++) assert.ok(ctx.rateOK(key, 3, 60000));
    assert.ok(!ctx.rateOK(key, 3, 60000));
});

// ---- Admin middleware (reuse real admin modules with mocked RTDB) ----
const store = {};
const mockRTDB = require("./mockFirebaseLive.js");
const Module = require("module");
const mockDir = __dirname;
const stubs = {
    "firebase/database": path.join(mockDir, "stubFirebaseDatabase.js"),
    "jsonwebtoken": path.join(mockDir, "stub-jsonwebtoken.js"),
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
    if (stubs[request]) return stubs[request];
    if (/datastore[/\\]firebase(\.js)?$/.test(request)) {
        return path.join(mockDir, "..", "datastore", "firebase.js");
    }
    return origResolve.call(this, request, ...rest);
};

console.log("Admin auth (mocked RTDB):");
(async () => {
    const core = require("../admin/core.js");
    const auth = require("../admin/auth.js");
    core.initAdmin({ rtdb: mockRTDB,
        dbUsers: { __mock: true },
        dbContent: { __mock: true },
        cacheGet: async () => null,
        cacheSet: async () => {},
        io: null,
        redisMode: "memory",
    });
    // Patch handles() to use our mock ref/get/set:
    const realHandles = core.handles;
    const mockRefFn = (dbObj, p) => ({ path: p });
        core.handles = () => ({
        dbUsers: { __mock: true },
        dbContent: { __mock: true },
        ref: mockRefFn,
        get: async (r) => ({ exists: () => store[r.path] !== undefined, val: () => store[r.path] }),
        set: async (r, v) => { if (v === null) delete store[r.path]; else store[r.path] = v; },
        push: (dbObj, p) => ({ path: p + "/p" + Math.random().toString(36).slice(2) }),
        cacheGet: async () => null,
        cacheSet: async () => {},
        io: null,
        redisMode: "memory",
    });

    store["control_admins/adm1"] = { uid: "adm1", email: "a@b.c", name: "A", role: "admin", active: true, psw: "x" };
    const sid = "sess123";
    store[`control_sessions/adm1/${sid}`] = { active: true, exp: Date.now() + 60000 };
    const token = jwt.sign({ uid: "adm1", sid }, process.env.ADMIN_JWT_SECRET, { expiresIn: 3600, issuer: "bayan-control-center" });

    const req = { headers: { authorization: "Bearer " + token } };
    let nextCalled = false;
    await auth.requireAdmin(req, { status() { return this; }, json() { } }, () => { nextCalled = true; });
    t("valid token + live session → req.admin with DB-loaded role", () => {
        assert.ok(nextCalled);
        assert.strictEqual(req.admin.role, "admin");
        assert.ok(req.admin.perms.includes("users.view"));
        assert.ok(!req.admin.perms.includes("users.role.change"));
    });

    delete store[`control_sessions/adm1/${sid}`];
    const res2 = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { } };
    await auth.requireAdmin({ headers: { authorization: "Bearer " + token } }, res2, () => { });
    t("revoked session → 401 even with valid token", () => assert.strictEqual(res2.statusCode, 401));

    const forged = jwt.sign({ uid: "adm1", sid: "nope", role: "super_admin" }, process.env.ADMIN_JWT_SECRET, { issuer: "bayan-control-center" });
    const res3 = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { } };
    await auth.requireAdmin({ headers: { authorization: "Bearer " + forged } }, res3, () => { });
    t("forged session sid → 401 (role in token is ignored)", () => assert.strictEqual(res3.statusCode, 401));

    const res4 = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { } };
    await auth.requireAdmin({ headers: {} }, res4, () => { });
    t("missing token → 401", () => assert.strictEqual(res4.statusCode, 401));

    t("deepSanitize strips psw/token deeply nested", () => {
        const clean = JSON.stringify(core.deepSanitize({ a: { psw: "h", nested: [{ token: "t", ok: 1 }] } }));
        assert.ok(clean.includes('"ok":1'));
        assert.ok(!clean.includes('"token"') && !clean.includes('"psw"'));
    });
    t("super_admin-only perms exclusive (admin.manage)", () => {
        for (const role of ["admin", "moderator", "analyst", "support"]) {
            assert.ok(!core.can(role, "admin.manage"));
            assert.ok(!core.can(role, "users.role.change"));
        }
        assert.ok(core.can("super_admin", "admin.manage"));
    });

    console.log(`\n${pass} passed, ${fail} failed`);
    console.log("SUMMARY: " + pass + " passed, " + fail + " failed");
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
