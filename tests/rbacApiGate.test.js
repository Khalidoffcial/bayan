/**
 * RBAC API-gate regression: each role vs allowed/denied admin endpoints.
 * Uses the real admin modules with mocked RTDB handles.
 * Run: node tests/rbacApiGate.test.js
 */
process.env.ADMIN_JWT_SECRET = "test-admin-secret";
process.env.ADMIN_AUDIT_SALT = "test-salt";
const assert = require("assert");
const path = require("path");
const Module = require("module");

const store = {};
const mockRTDB = require("./mockFirebaseLive.js");
const stubs = {
    "firebase/database": path.join(__dirname, "stubFirebaseDatabase.js"),
    "jsonwebtoken": path.join(__dirname, "stub-jsonwebtoken.js"),
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
    if (stubs[request]) return stubs[request];
    if (/datastore[/\\]firebase$/.test(request)) return path.join(__dirname, "mockFirebaseLive.js");
    return origResolve.call(this, request, ...rest);
};

// Seed roles
for (const [uid, role] of [
    ["sa1", "super_admin"], ["ad1", "admin"], ["md1", "moderator"],
    ["an1", "analyst"], ["sp1", "support"],
]) {
    store[`control_admins/${uid}`] = { uid, email: uid + "@b.test", name: uid, role, active: true, psw: "x" };
    store[`control_sessions/${uid}/s`] = { active: true, exp: Date.now() + 600000 };
}

(async () => {
    const core = require("../admin/core.js");
    const auth = require("../admin/auth.js");
    const jwt = require("jsonwebtoken");
    core.initAdmin({ rtdb: mockRTDB,});
        core.handles = () => ({
        ref: (db, p) => ({ path: p }),
        get: async (r) => ({ exists: () => store[r.path] !== undefined, val: () => store[r.path] }),
        set: async (r, v) => { if (v === null) delete store[r.path]; else store[r.path] = v; },
        push: (db, p) => ({ path: p + "/x" }),
        cacheGet: async () => null, cacheSet: async () => { }, io: null, redisMode: "memory",
    });

    let pass = 0, fail = 0;
    const t = async (name, fn) => {
        try { await fn(); pass++; console.log("  ✓ " + name); }
        catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
    };

    function makeReq(uid, role) {
        const token = jwt.sign({ uid, sid: "s" }, process.env.ADMIN_JWT_SECRET, { issuer: "bayan-control-center" });
        return { headers: { authorization: "Bearer " + token }, ip: "t", method: "POST", path: "/x", params: {}, body: {} };
    }
    function makeRes() {
        return { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { } };
    }
    async function tryPerm(uid, perm) {
        const req = makeReq(uid);
        const res = makeRes();
        await new Promise((r) => auth.requireAdmin(req, res, () => r()));
        if (res.statusCode) return "auth-fail";
        return core.can(req.admin.role, perm) ? "allowed" : "denied";
    }

    const matrix = [
        // perm, super, admin, moderator, analyst, support
        ["dashboard.view", 1, 1, 1, 1, 1],
        ["users.view", 1, 1, 1, 0, 1],
        ["users.suspend", 1, 1, 1, 0, 0],
        ["users.ban", 1, 1, 0, 0, 0],
        ["users.delete", 1, 0, 0, 0, 0],
        ["users.role.change", 1, 0, 0, 0, 0],
        ["content.view", 1, 1, 1, 1, 1],
        ["content.hide", 1, 1, 1, 0, 0],
        ["content.feature", 1, 1, 0, 0, 0],
        ["content.delete", 1, 1, 0, 0, 0],
        ["audit.view", 1, 1, 0, 0, 0],
        ["db.read", 1, 1, 1, 1, 0],
        ["db.write", 1, 1, 0, 0, 0],
        ["users.unban", 1, 1, 0, 0, 0],
        ["users.restrict", 1, 1, 1, 0, 0],
        ["content.edit", 1, 1, 0, 0, 0],
        ["content.restore", 1, 1, 0, 0, 0],
        ["db.delete", 1, 0, 0, 0, 0],
        ["db.export", 1, 1, 0, 1, 0],
        ["logs.view", 1, 1, 1, 1, 0],
        ["system.settings", 1, 1, 0, 0, 0],
        ["system.maintenance", 1, 0, 0, 0, 0],        ["admin.manage", 1, 0, 0, 0, 0],
    ];
    const uids = ["sa1", "ad1", "md1", "an1", "sp1"];
    console.log("Role×permission matrix (server-side gate):");
    for (const [perm, ...expected] of matrix) {
        for (let i = 0; i < expected.length; i++) {
            await t(`${perm} → ${uids[i]} expects ${expected[i] ? "ALLOW" : "DENY"}`, async () => {
                const got = await tryPerm(uids[i], perm);
                assert.strictEqual(got, expected[i] ? "allowed" : "denied");
            });
        }
    }
    // auth failures
    await t("expired session → auth-fail for any role", async () => {
        delete store["control_sessions/ad1/s"];
        const req = makeReq("ad1"); const res = makeRes();
        await new Promise((r) => auth.requireAdmin(req, res, () => r()));
        store["control_sessions/ad1/s"] = { active: true, exp: Date.now() + 600000 };
        assert.strictEqual(res.statusCode, 401);
    });
    await t("inactive admin → 403", async () => {
        store["control_admins/md1"].active = false;
        const req = makeReq("md1"); const res = makeRes();
        await new Promise((r) => auth.requireAdmin(req, res, () => r()));
        store["control_admins/md1"].active = true;
        assert.strictEqual(res.statusCode, 403);
    });

    console.log(`\n${pass} passed, ${fail} failed`);
    console.log("SUMMARY: " + pass + " passed, " + fail + " failed");
    process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
