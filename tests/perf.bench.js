/**
 * Local performance benchmark for auth routes (/signup, /signin, /username/available)
 * Run (from backend): node tests/perf.bench.js
 *
 * Starts the real mainServer.js on an isolated port with REDIS disabled,
 * then measures p50/p95 wall-clock latency of each auth operation.
 * NOTE: requires ACCESS_TOKEN_SECRET env (see .env / .env.example).
 */
process.env.PORT = process.env.PORT || "4399";
process.env.REDIS_URL = ""; // force memory-cache path (no external service)
process.env.NODE_ENV = "test";

const path = require("path");
process.chdir(path.join(__dirname, "..")); // categories.json etc. are CWD-relative

const child = require("child_process").spawn(
    process.execPath,
    ["mainServer.js"],
    { cwd: path.join(__dirname, ".."), env: process.env, stdio: ["ignore", "pipe", "pipe"] }
);
let bootLog = "";
child.stdout.on("data", (d) => { bootLog += d; });
child.stderr.on("data", (d) => { bootLog += d; });

const PORT = Number(process.env.PORT);
const BASE = `http://127.0.0.1:${PORT}`;

const timings = { signin: [], signup: [], usernameAvailable: [], health: [] };

async function timed(label, fn) {
    const t0 = Date.now();
    try { await fn(); } catch (e) { /* count the latency, report the error */ }
    timings[label].push(Date.now() - t0);
}

const stats = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return {
        n: s.length,
        p50: s[Math.floor(s.length * 0.5)] ?? null,
        p95: s[Math.floor(s.length * 0.95)] ?? null,
    };
};

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
    // wait for boot
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
        await wait(200);
        try {
            const r = await fetch(`${BASE}/health`);
            up = r.ok;
        } catch { /* not up yet */ }
    }
    if (!up) {
        console.error("Server did not boot. Log:\n" + bootLog);
        child.kill();
        process.exit(1);
    }
    console.log("Server up — measuring (health warm-up excluded)...\n");

    const run = async (label, n, fn) => {
        timings[label] = [];
        for (let i = 0; i < n; i++) await timed(label, fn(i));
        const s = stats(timings[label]);
        console.log(`${label.padEnd(20)} n=${s.n}  p50=${s.p50}ms  p95=${s.p95}ms`);
    };

    await run("GET /health", 20, () => async () => {
        await fetch(`${BASE}/health`);
    });
    await run("POST /username/available", 20, (i) => async () => {
        await fetch(`${BASE}/username/available`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "bench_user_" + i }),
        });
    });
    await run("POST /signup (new)", 15, (i) => async () => {
        const r = await fetch(`${BASE}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Bench User " + i,
                username: "benchuser" + i + "_" + Date.now(),
                email: `bench${i}_${Date.now()}@example.test`,
                password: "BenchPass123",
            }),
        });
        const body = await r.json();
        if (!body.success && body.code !== "USERNAME_TAKEN") {
            console.log(`  signup# ${i} -> ${r.status} ${body.code || body.message}`);
        }
    });
    // Signin attempts beyond the 6th are RATE_LIMITED by the fixed-window login
    // limiter (LOGIN_MAX=20 / 5min) — that is expected, secure behavior. Only
    // the first 6 attempts measure actual auth latency.
    await run("POST /signin (wrong pw)", 6, (i) => async () => {
        await fetch(`${BASE}/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifierUser: `bench${i}@example.test`, password: "WrongPass999X" }),
        });
    });

    console.log("\nDone.");
    child.kill();
    process.exit(0);
})().catch((e) => { console.error(e); child.kill(); process.exit(1); });
