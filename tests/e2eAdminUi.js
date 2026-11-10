/**
 * Live E2E: admin login → me → pages' endpoints with the real server.
 * Requires the server NOT running with admin secrets; we spawn it with env.
 * Run: node tests/e2eAdminUi.js
 */
process.env.ADMIN_JWT_SECRET = "e2e-admin-secret-0123456789abcdef";
process.env.ADMIN_BOOTSTRAP_TOKEN = "e2e-bootstrap-token-0123456789";
process.env.ADMIN_AUDIT_SALT = "e2e-audit-salt";
process.env.PORT = "4599";
const assert = require("assert");
const { spawn } = require("child_process");
const path = require("path");

const BASE = "http://127.0.0.1:4599/admin/api";
const BOOT_HEADERS = { "x-bootstrap-token": process.env.ADMIN_BOOTSTRAP_TOKEN };
let pass = 0, fail = 0;
const t = (n, fn) => fn().then(() => { pass++; console.log("  ✓ " + n); }, (e) => { fail++; console.log("  ✗ " + n + " — " + (e.msg || e.message)); });
async function j(method, p, body, token, extraHeaders) {
    const res = await fetch(BASE + p, {
        method, headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...(extraHeaders || {}),
        }, body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch { }
    return { status: res.status, data };
}

(async () => {
// start server first (bootstrap runs THROUGH the API, like production)
    const proc = spawn(process.execPath, [path.join(__dirname, "..", "mainServer.js")], {
        env: {
            ...process.env,
            NODE_OPTIONS: "--require " + path.join(__dirname, "mockHook.cjs"),
        },
        stdio: ["ignore", "pipe", "inherit"],
    });
    await new Promise((r) => setTimeout(r, 3500));
    const boot = await j("POST", "/bootstrap", { email: "root@bayan.test", password: "Str0ng-Passw0rd!", name: "Root" }, null, BOOT_HEADERS);
    assert.ok([200, 201].includes(boot.status), "bootstrap: " + JSON.stringify(boot.data));

    try {
        await t("login with correct credentials → token + admin profile", async () => {
            const r = await j("POST", "/login", { email: "root@bayan.test", password: "Str0ng-Passw0rd!" });
            assert.strictEqual(r.status, 200);
            assert.ok(r.data.accessToken && r.data.admin.role === "super_admin", JSON.stringify(r.data).slice(0, 200));
            globalThis.TOK = r.data.accessToken;
        });
        await t("wrong password → 401", async () => {
            const r = await j("POST", "/login", { email: "root@bayan.test", password: "wrong-pass" });
            assert.strictEqual(r.status, 401);
        });
        await t("/me with valid token → profile + permissions", async () => {
            const r = await j("GET", "/me", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            assert.ok(Array.isArray(r.data.admin.perms));
        });
        await t("/me without token → 401", async () => {
            const r = await j("GET", "/me");
            assert.strictEqual(r.status, 401);
        });
        await t("stats/overview → metrics with sources (no fabricated values)", async () => {
            const r = await j("GET", "/stats/overview", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            const users = r.data.stats.users;
            assert.ok(typeof users.value === "number" && users.source, "metric must have source");
        });
        await t("users list → paginated array", async () => {
            const r = await j("GET", "/users?page=1&pageSize=5", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            assert.ok(Array.isArray(r.data.items) && typeof r.data.total === "number");
        });
        await t("content list → paginated array", async () => {
            const r = await j("GET", "/content/posts?page=1&pageSize=5", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            assert.ok(Array.isArray(r.data.items));
        });
        await t("audit → append-only entries list", async () => {
            const r = await j("GET", "/audit?page=1", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            assert.ok(Array.isArray(r.data.items));
        });
        await t("health → uptime + firebase probes", async () => {
            const r = await j("GET", "/health", null, globalThis.TOK);
            assert.strictEqual(r.status, 200);
            assert.ok(typeof r.data.uptimeSec === "number");
            assert.ok(r.data.firebase);
        });
        await t("logout → subsequent /me with same token → 401", async () => {
            await j("POST", "/logout", {}, globalThis.TOK);
            const r = await j("GET", "/me", null, globalThis.TOK);
            assert.strictEqual(r.status, 401);
        });
    } finally {
        proc.kill();
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
