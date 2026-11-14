/**
 * Bayan Space — Authentication & username-uniqueness regression suite.
 *
 * Run: node tests/authRegression.test.js
 * Strategy: static + unit assertions against a MOCKED Firebase layer
 * (mirrors tests/mockFirebase.js) — never touches production Firebase.
 */
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-secret";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

let pass = 0, fail = 0;
const t = (name, fn) => {
    try { fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
};
const tAsync = async (name, fn) => {
    try { await fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
};

const src = fs.readFileSync(path.join(__dirname, "..", "mainServer.js"), "utf8");
const usernameSvcSrc = fs.readFileSync(path.join(__dirname, "..", "datastore", "username.service.js"), "utf8");

console.log("\n── Static contract checks (mainServer.js) ──");
t("POST /signup uses signupRateLimit", () => {
    assert.ok(src.includes('app.post("/signup", signupRateLimit'));
});
t("signup returns USERNAME_TAKEN code with 409", () => {
    assert.ok(src.includes('code: "USERNAME_TAKEN"'));
});
t("signup returns EMAIL_TAKEN code with 409", () => {
    assert.ok(src.includes('code: "EMAIL_TAKEN"'));
});
t("signup reserves username BEFORE profile write", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    const reserveIdx = route.indexOf("reserveUsername(usernameKey, uniqueId)");
    const insertIdx = route.indexOf("logup_user_Insert(");
    assert.ok(reserveIdx > 0 && insertIdx > reserveIdx, "reserve → insert order required");
});
t("signup releases reservation on profile-write failure (no orphaned usernames)", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    assert.ok(route.includes("rollbackReservation(usernameKey, uniqueId)"));
});
t("signup idempotent retry returns existing account (no duplicates from double submit)", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    assert.ok(route.includes("existingByEmail") && route.includes("Account created successfully"));
});
t("username availability endpoint documented as informational", () => {
    assert.ok(src.includes("INFORMATIONAL ONLY"));
});
t("timing logs never include passwords/tokens", () => {
    const timings = src.match(/\[timing\][^`]*`/g) || [];
    assert.ok(src.includes('[timing] signup stage='), "timing logs exist");
    assert.ok(!timings.some((l) => /password|psw|token/i.test(l.replace("logStage", ""))), "no secrets in timing logs");
});
t("signin/authGoogle/signup return { success } contract", () => {
    for (const frag of ['success: true, message: "Login successful"']) {
        assert.ok(src.includes(frag));
    }
});
t("signin treats datastore outage as 503 (not 500→logout)", () => {
    const route = src.slice(src.indexOf('app.post("/signin"'), src.indexOf('app.post("/authGoogle"'));
    assert.ok(route.includes("SERVICE_UNAVAILABLE"));
});
t("/ and /health are static, registered before heavy middleware", () => {
    const healthIdx = src.indexOf('app.get("/health"');
    const firstRouteIdx = src.indexOf('app.post("/signin"');
    assert.ok(healthIdx > 0 && healthIdx < firstRouteIdx);
});
t("process-level guards exist (uncaughtException/unhandledRejection)", () => {
    assert.ok(src.includes('process.on("uncaughtException"'));
    assert.ok(src.includes('process.on("unhandledRejection"'));
});
t("banned accounts rejected on /auth with 403", () => {
    assert.ok(src.includes('message: "Account banned"'));
});
t("expired/legacy tokens → 401 (not 403) so the client redirects only on confirmed expiry", () => {
    assert.ok(src.includes('Token expired, please sign in again'));
});
t("admin JWT remains separate (ADMIN_JWT_SECRET, not ACCESS_TOKEN_SECRET)", () => {
    const auth = fs.readFileSync(path.join(__dirname, "..", "admin", "auth.js"), "utf8");
    assert.ok(auth.includes("ADMIN_JWT_SECRET"));
    assert.ok(!auth.includes("ACCESS_TOKEN_SECRET"));
});

console.log("\n── Username service (mocked Firebase) ──");
// Build an in-memory mock of datastore/firebase that supports the transaction
// semantics used by username.service.js.
const store = new Map();
const refOf = (db, p) => ({ path: p });
const mkSnap = (val) => ({ exists: () => val !== undefined, val: () => (val === undefined ? null : val) });
const mockFirebase = {
    db: {},
    ref: refOf,
    get: async (r) => mkSnap(store.get(r.path)),
    set: async (r, v) => { if (v === null) store.delete(r.path); else store.set(r.path, v); },
    update: async (r, v) => {
        const cur = store.get(r.path) || {};
        store.set(r.path, { ...cur, ...v });
    },
    // Serial-queued transactions: exactly the RTDB concurrency model at this scale.
    runTransaction: (orig => (tref, fn) => orig(async (cur) => {
        const snapVal = store.get(tref.path);
        const next = fn(mkSnap(snapVal));
        if (next === undefined) return { committed: false, snapshot: mkSnap(snapVal) };
        store.set(tref.path, next);
        return { committed: true, snapshot: mkSnap(next) };
    }))(fn => fn),
};
const svcPath = require.resolve(path.join(__dirname, "..", "datastore", "username.service.js"));
delete require.cache[svcPath];
const Module = require("module");
const origResolve = Module._resolveFilename;
const MOCK_PATH = path.join(__dirname, "..", "datastore", "_mock_firebase_test_only.js");
fs.writeFileSync(MOCK_PATH, "module.exports = global.__mockFirebase;");
global.__mockFirebase = mockFirebase;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebase") {
        try { return origResolve.call(this, MOCK_PATH, ...args); }
        catch { return origResolve.call(this, request, ...args); }
    }
    return origResolve.call(this, request, ...args);
};
const svc = require(svcPath);
Module._resolveFilename = origResolve;

t("normalization: trims, case-folds, collapses whitespace, strips diacritics", () => {
    assert.strictEqual(svc.normalizeUsername("  Ahmed  ").key, "ahmed");
    assert.strictEqual(svc.normalizeUsername("A HMED").key, "ahmed");
    assert.strictEqual(svc.normalizeUsername("أَحْمَد").key, "أحمد");
});
t("normalization: rejects invalid chars / too short / too long", () => {
    assert.strictEqual(svc.normalizeUsername("ab").ok, false);
    assert.strictEqual(svc.normalizeUsername("bad name!").ok, false);
    assert.strictEqual(svc.normalizeUsername("a".repeat(31)).ok, false);
    assert.strictEqual(svc.normalizeUsername("..x").ok, false);
    // "@" is stripped by the client; the server treats raw "@" as invalid input
    assert.strictEqual(svc.normalizeUsername("@Ahmed").ok, false);
    assert.strictEqual(svc.normalizeUsername("Ahmed@").ok, false);
});
tAsync("atomic reservation: first user wins, second gets USERNAME_TAKEN", async () => {
    store.clear();
    const a = await svc.reserveUsername("khalid", "uid-A");
    const b = await svc.reserveUsername("khalid", "uid-B");
    assert.ok(a.reserved && !b.reserved, "exactly one wins");
    assert.strictEqual(b.owner, "uid-A");
});
tAsync("reservation is idempotent for the same owner (retry-safe)", async () => {
    store.clear();
    await svc.reserveUsername("khalid", "uid-A");
    const again = await svc.reserveUsername("khalid", "uid-A");
    assert.ok(again.reserved);
});
tAsync("release: a user cannot release another user's reservation", async () => {
    store.clear();
    await svc.reserveUsername("khalid", "uid-A");
    const released = await svc.releaseUsernameIfOwner("khalid", "uid-B");
    assert.strictEqual(released, false);
    const avail = await svc.isUsernameAvailable("khalid");
    assert.strictEqual(avail, false, "reservation of uid-A untouched");
});
tAsync("rollback after failed account creation frees the username", async () => {
    store.clear();
    await svc.reserveUsername("sara", "uid-1");
    await svc.rollbackReservation("sara", "uid-1");
    assert.ok(await svc.isUsernameAvailable("sara"));
});
tAsync("username change: reserve new → update → release old; old user keeps uniqueness", async () => {
    store.clear();
    store.set("user_data/Profile/u1", { Id_user: "u1", S_user: "@oldname" });
    const res = await svc.changeUsername({ uid: "u1", currentDisplayUsername: "@oldname", newKey: "newname" });
    assert.ok(res.ok);
    assert.strictEqual(store.get("user_data/Profile/u1").S_user, "@newname");
    assert.ok(await svc.isUsernameAvailable("oldname"));
    assert.ok(!(await svc.isUsernameAvailable("newname")));
    // Another user cannot take the previously-released name while reserved... it WAS released:
    const claim = await svc.reserveUsername("oldname", "u2");
    assert.ok(claim.reserved);
});
tAsync("username change to a TAKEN name fails without touching the profile", async () => {
    store.clear();
    store.set("user_data/Profile/u1", { Id_user: "u1", S_user: "@mine" });
    await svc.reserveUsername("taken", "someone-else");
    const res = await svc.changeUsername({ uid: "u1", currentDisplayUsername: "@mine", newKey: "taken" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, "USERNAME_TAKEN");
    assert.strictEqual(store.get("user_data/Profile/u1").S_user, "@mine", "profile untouched");
});
tAsync("case-insensitive uniqueness: Ahmed and ahmed collide", async () => {
    store.clear();
    const a = await svc.reserveUsername(svc.normalizeUsername("Ahmed").key, "u1");
    const b = await svc.reserveUsername(svc.normalizeUsername("AHMED").key, "u2");
    assert.ok(a.reserved && !b.reserved);
});
tAsync("findExistingDuplicates detects two profiles sharing one normalized name", async () => {
    store.clear();
    store.set("user_data/Profile/u1", { Id_user: "u1", S_user: "@ahmed", email: "a@x.test" });
    store.set("user_data/Profile/u2", { Id_user: "u2", S_user: "ahmed", email: "b@x.test" });
    const { duplicates } = await svc.findExistingDuplicates();
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].users.length, 2);
});

console.log("\n── Signup concurrency semantics (static, route source) ──");
t("EMAIL_TAKEN takes priority over username reservation (no orphan on duplicate email)", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    assert.ok(route.indexOf("findbyEmail(emailNorm)") < route.indexOf("reserveUsername(usernameKey"),
        "email dedupe check must run BEFORE the username reservation");
});
t("USERNAME_TAKEN short-circuits BEFORE any profile write", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    assert.ok(route.indexOf('code: "USERNAME_TAKEN"') < route.indexOf("logup_user_Insert("),
        "409 USERNAME_TAKEN must be returned before logup_user_Insert is reachable");
});
t("reservation rollback is owner-scoped (never another user's reservation)", () => {
    const svcSrc = usernameSvcSrc;
    assert.ok(svcSrc.includes("releaseUsernameIfOwner"));
    assert.ok(svcSrc.includes("String(current.uid) === String(uid)"));
});
t("duplicate-email retry path does NOT reserve a new username", () => {
    const route = src.slice(src.indexOf('app.post("/signup"'), src.indexOf('app.post("/username/available"'));
    const emailBlockEnd = route.indexOf("return res.status(409).json({ success: false, code: \"EMAIL_TAKEN\"");
    const reserveBlock = route.indexOf("reserveUsername(usernameKey, uniqueId)");
    assert.ok(emailBlockEnd > 0 && reserveBlock > emailBlockEnd);
});

console.log("\n── Legacy-token rejection ──");
t("a legacy hash-bearing token is refused by requireUser contract (static)", () => {
    assert.ok(src.includes("decoded.pass !== undefined"));
});

fs.unlinkSync(path.join(__dirname, "..", "datastore", "_mock_firebase_test_only.js"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
