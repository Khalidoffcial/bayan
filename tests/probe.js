process.env.ADMIN_JWT_SECRET = "e2e-admin-secret-0123456789abcdef";
process.env.ADMIN_BOOTSTRAP_TOKEN = "e2e-bootstrap-token-0123456789";
process.env.ADMIN_AUDIT_SALT = "e2e-audit-salt";
process.env.PORT = "4599";
const { spawn } = require("child_process");
const path = require("path");
const BASE = "http://127.0.0.1:4599/admin/api";
async function j(method, p, body, token, extraHeaders) {
    const res = await fetch(BASE + p, {
        method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}), ...(extraHeaders || {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch { }
    return { status: res.status, data };
}
(async () => {
    const proc = spawn(process.execPath, [path.join(__dirname, "..", "mainServer.js")], {
        env: { ...process.env, NODE_OPTIONS: "--require " + path.join(__dirname, "mockHook.cjs") },
        stdio: ["ignore", "pipe", "inherit"],
    });
    proc.stdout.on("data", () => { });
    await new Promise((r) => setTimeout(r, 4000));
    const boot = await j("POST", "/bootstrap", { email: "root@bayan.test", password: "Str0ng-Passw0rd!", name: "Root" }, null, { "x-bootstrap-token": process.env.ADMIN_BOOTSTRAP_TOKEN });
    console.log("BOOT:", boot.status, JSON.stringify(boot.data));
    await new Promise((r) => setTimeout(r, 1200));
    const login = await j("POST", "/login", { email: "root@bayan.test", password: "Str0ng-Passw0rd!" });
    console.log("LOGIN:", login.status, JSON.stringify(login.data).slice(0, 160));
    proc.kill();
    process.exit(0);
})();
