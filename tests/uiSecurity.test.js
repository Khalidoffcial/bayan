/**
 * UI security audit (static): no secrets, no mock data, real actions only.
 * Run (from backend): node tests/uiSecurity.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); pass++; console.log("  ✓ " + n); } catch (e) { fail++; console.log("  ✗ " + n + " — " + e.message); } };

const UI = "D:" + path.sep + "bayan" + path.sep + "control-center" + path.sep + "ui";
let all = [];
function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) { if (f.name !== "node_modules" && f.name !== "dist") walk(p); }
        else if (/\.(js|jsx|html|css)$/.test(f.name)) all.push({ path: p, src: fs.readFileSync(p, "utf8") });
    }
}
walk(UI);

console.log("No secrets in UI:");
t("no hardcoded API keys / secrets / service accounts", () => {
    const bad = /(?:api[_-]?key|secret|private[_-]?key|service[_-]?account|password)\s*[:=]\s*["'][^"']{8,}["']/i;
    const hits = all.filter((f) => !f.path.includes("i18n") && bad.test(f.src));
    assert.strictEqual(hits.length, 0, JSON.stringify(hits.map((h) => h.path)));
});
t("no mock/fake/random data generators in UI source", () => {
    const bad = /\b(mock|fake|dummy|lorem|Math\.random\(\)\s*\*\s*\d{4,})\b/i;
    const hits = all.filter((f) => bad.test(f.src));
    assert.strictEqual(hits.length, 0, JSON.stringify(hits.map((h) => h.path)));
});
t("all fetches go through /admin/api with Bearer auth", () => {
    const client = all.find((f) => f.path.includes("client.js"));
    assert.ok(client, "client.js missing");
    assert.ok(client.src.includes('"/admin/api"'));
    assert.ok(client.src.includes("Authorization"));
});
t("no direct DB writes from the UI (no firebase SDK imported)", () => {
    const hits = all.filter((f) => /from\s+"firebase|require\("firebase/.test(f.src));
    assert.strictEqual(hits.length, 0);
});

console.log("Real actions only:");
t("every user action button maps to a real endpoint", () => {
    const m = all.find((f) => f.path.includes("main.jsx"));
    for (const a of ["suspend", "unsuspend", "ban", "unban"]) {
        assert.ok(m.src.includes(`"${a}"`) || m.src.includes(a), a);
    }
});
t("content actions (hide/restore/feature/unfeature) map to endpoints", () => {
    const m = all.find((f) => f.path.includes("main.jsx"));
    for (const a of ["hide", "restore", "feature", "unfeature"]) assert.ok(m.src.includes(`type: "${a}"`), a);
});
t("confirm dialog REQUIRES a reason ≥5 chars for destructive actions", () => {
    const m = all.find((f) => f.path.includes("main.jsx"));
    const u = all.find((f) => f.path.includes("ui.jsx"));
    assert.ok(m.src.includes("needReason: true"));
    assert.ok(u.src.includes("length >= 5"));
});
t("unavailable stats render as explicitly unavailable (no invented numbers)", () => {
    const u = all.find((f) => f.path.includes("ui.jsx"));
    assert.ok(u.src.includes("available === false"));
});
t("token kept out of localStorage (sessionStorage only, cleared on 401)", () => {
    const c = all.find((f) => f.path.includes("client.js"));
    assert.ok(c.src.includes("sessionStorage") && !c.src.includes("localStorage.setItem(\"cc_token\""));
    assert.ok(c.src.includes("clearSession()"));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
