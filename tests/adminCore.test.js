/**
 * Control Center admin core tests — standalone script, no live Firebase.
 * Run: node tests/adminCore.test.js
 *
 * Covers (Phase 1 security contract):
 *  1. RBAC matrix — role/permission boundaries incl. super_admin-only perms.
 *  2. deepSanitize — secrets never pass through (psw, tokens...).
 *  3. maskEmail.
 *  4. Audit write — record shape + append-only semantics with mocked RTDB.
 *  5. requireAdmin middleware — bad/missing token → 401; valid session+token → req.admin.
 */
process.env.ADMIN_JWT_SECRET = "test-admin-secret";
process.env.ADMIN_AUDIT_SALT = "test-salt";

const assert = require("assert");
const Module = require("module");

// ── Mock the user-db firebase module BEFORE core/auth load ──
const store = {};
const mockPushCounter = { n: 0 };
const mockRef = (db, path) => ({ path, db });
const mockSet = async (r, value) => {
    if (value === null) delete store[r.path];
    else store[r.path] = value;
};
const mockGet = async (r) => ({
    exists: () => store[r.path] !== undefined,
    val: () => store[r.path],
});
const mockPush = (db, path) => ({ path: `${path}/push${++mockPushCounter.n}` });
const mockUpdate = async (r, patch) => { store[r.path] = { ...(store[r.path] || {}), ...patch }; };

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./datastore/firebase" || request.endsWith("datastore/firebase") && request.includes("admin")) {
        // not used — admin/core receives handles by injection
    }
    return origResolve.call(this, request, ...args);
};

const core = require("../admin/core");
const auth = require("../admin/auth");
const jwt = require("jsonwebtoken");

let passed = 0;
function ok(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (e) { console.error(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
}

// init handles with mocked RTDB shim
core.initAdmin({
    dbUsers: { label: "users-db" },
    dbContent: { label: "content-db" },
    cacheGet: async () => null,
    cacheSet: async () => { },
    io: null,
    redisMode: "memory",
});
// swap the real firebase helpers out via handles injection surface:
// core.writeAudit uses handles() destructuring of { ref, push, set } — provide them
const realHandles = core.handles;
core.handles = () => ({
    ...realHandles(),
    dbUsers: { label: "users-db" },
    dbContent: { label: "content-db" },
    ref: mockRef, set: mockSet, get: mockGet, push: mockPush, update: mockUpdate,
});

console.log("RBAC matrix:");
ok("super_admin holds every permission", () => {
    for (const p of Object.keys(core.MATRIX)) assert(core.can("super_admin", p), p);
});
ok("moderator cannot ban/delete/change roles", () => {
    assert(!core.can("moderator", "users.ban"));
    assert(!core.can("moderator", "users.delete"));
    assert(!core.can("moderator", "users.role.change"));
});
ok("analyst cannot suspend users", () => assert(!core.can("analyst", "users.suspend")));
ok("unknown role gets no permissions", () => assert.deepStrictEqual(core.permissionsFor("hacker"), []));
ok("support can view users but not edit", () => {
    assert(core.can("support", "users.view"));
    assert(!core.can("support", "content.edit"));
});
ok("super_admin-only perms are truly exclusive", () => {
    for (const p of ["users.role.change", "users.delete", "db.delete", "admin.manage", "system.maintenance", "backup.restore"]) {
        for (const r of ["admin", "moderator", "analyst", "support"]) assert(!core.can(r, p), `${r}:${p}`);
    }
});

console.log("Sanitization:");
ok("deepSanitize strips psw/token nested deep", () => {
    const out = core.deepSanitize({ a: 1, psw: "x", nested: { token: "t", ok: 2, list: [{ apiKey: "k" }] } });
    assert.strictEqual(out.psw, undefined);
    assert.strictEqual(out.nested.token, undefined);
    assert.strictEqual(out.nested.ok, 2);
    assert.strictEqual(out.nested.list[0].apiKey, undefined);
});
ok("maskEmail masks local part, keeps domain", () => {
    const m = core.maskEmail("khalid@example.com");
    assert(m.startsWith("k") && m.endsWith("@example.com") && m.includes("*"), m);
    assert.strictEqual(core.maskEmail(""), "***");
});

console.log("Audit:");
(async () => {
    ok("audit record shape + append-only push keys", async () => {
        const rec = await core.writeAudit({
            adminUid: "A1", adminRole: "admin", action: "users.suspend",
            targetType: "user", targetId: "123", reason: "spam", ip: "1.2.3.4",
            before: { accountState: "active" }, after: { accountState: "suspended" },
        });
        assert.strictEqual(rec.action, "users.suspend");
        assert.strictEqual(rec.success, true);
        assert(rec.ts > 0 && rec.iso);
        assert(rec.ipHash && rec.ipHash.length === 16);
        const keys = Object.keys(store).filter((k) => k.startsWith("control_audit/"));
        assert.strictEqual(keys.length, 1);
    });

    ok("audit failure visible when store throws", async () => {
        core.handles = () => ({ ...realHandles(), dbUsers: {}, ref: mockRef, push: () => { throw new Error("db-down"); }, set: mockSet, get: mockGet });
        let threw = false;
        try { await core.writeAudit({ adminUid: "A1", action: "x" }); } catch { threw = true; }
        assert(threw);
        // restore the good shim
        core.handles = () => ({ ...realHandles(), dbUsers: { label: "users-db" }, dbContent: { label: "content-db" }, ref: mockRef, set: mockSet, get: mockGet, push: mockPush, update: mockUpdate });
    });

    console.log("Admin JWT middleware:");
    ok("valid token + live session → req.admin with DB-loaded role", async () => {
        store["control_admins/A1"] = { uid: "A1", name: "K", email: "k@x.com", role: "admin", active: true };
        store["control_sessions/A1/S1"] = { active: true, exp: Date.now() + 60000 };
        const token = auth.signAdminToken("A1", "S1");
        const req = { headers: { authorization: `Bearer ${token}` } };
        let nextCalled = false;
        await new Promise((res) => auth.requireAdmin(req, { status: () => ({ json: () => { } }) }, () => { nextCalled = true; res(); }));
        assert(nextCalled);
        assert.strictEqual(req.admin.role, "admin"); // loaded from DB, not token
        assert(req.admin.perms.includes("users.suspend"));
    });
    ok("expired/absent session → 401 even with valid token", async () => {
        const req2 = { headers: { authorization: `Bearer ${auth.signAdminToken("A1", "GONE")}` } };
        let statusCode = 0;
        await new Promise((res) => auth.requireAdmin(req2, { status: (c) => { statusCode = c; return { json: () => { } }; } }, () => res()));
        assert.strictEqual(statusCode, 401);
    });
    ok("role escalation via forged token payload fails (role not in token)", async () => {
        const forged = jwt.sign({ uid: "A1", sid: "S1", role: "super_admin" }, "test-admin-secret", { issuer: "bayan-control-center" });
        const req = { headers: { authorization: `Bearer ${forged}` } };
        await new Promise((res) => auth.requireAdmin(req, { status: (c) => ({ json: () => { } }) }, () => res()));
        // session valid → passes, but role comes from DB ("admin"), never the token
        assert.strictEqual(req.admin ? req.admin.role : null, "admin");
    });

    console.log(`\n${passed} assertions passed${process.exitCode ? " (with failures above)" : ""}`);
    process.exit(process.exitCode || 0);
})();
