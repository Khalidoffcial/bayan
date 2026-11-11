/**
 * Regression tests for the reported production defects:
 *  1. /admin/api/moderation/* must actually be mounted (was 404 in prod).
 *  2. User/content actions must be POST /users/:uid/actions { action } (was
 *     frontend calling /users/:uid/<action> -> 404).
 *  3. Null/undefined target ids must be rejected client-side before any fetch.
 *
 * Run: node tests/moderationRoutes.mount.test.js
 */
process.env.ADMIN_JWT_SECRET = "test-admin-secret";
process.env.ADMIN_AUDIT_SALT = "test-salt";
const assert = require("assert");
const fs = require("fs");

let passed = 0, failed = 0;
function ok(name, cond) {
    if (cond) { passed++; console.log("  [PASS] " + name); }
    else { failed++; console.error("  [FAIL] " + name); process.exitCode = 1; }
}

// 1. moderation router is mounted inside the admin router
const adminSrc = fs.readFileSync("admin/index.js", "utf8");
ok("admin/index.js requires ../moderation/routes", /require\("\.\.\/moderation\/routes"\)/.test(adminSrc));
ok("admin/index.js mounts router.use('/moderation', ...)", /router\.use\("\/moderation"/.test(adminSrc));
ok("moderation mount is behind requireAdmin", /router\.use\("\/moderation",\s*auth\.requireAdmin/.test(adminSrc));

// 2. the mounted router is a real express Router with the expected routes
const modRouter = require("../moderation/routes");
const stack = modRouter.stack || [];
const paths = stack.filter(l => l.route).map(l => Object.keys(l.route.methods)[0].toUpperCase() + " " + l.route.path);
ok("moderation routes export an express Router", stack.length > 0);
["GET /cases", "GET /cases/:id", "POST /cases/:id/actions", "GET /dictionary",
 "POST /dictionary", "PATCH /dictionary/:id", "DELETE /dictionary/:id",
 "GET /appeals", "POST /appeals/:id/resolve"].forEach(function (p) {
    ok(p + " registered", paths.indexOf(p) !== -1);
});

// 3. frontend client sends the contract the backend implements
const clientSrc = fs.readFileSync("../../control-center/ui/src/api/client.js", "utf8");
ok("userAction posts to /users/:uid/actions (not /users/:uid/<verb>)",
    /`\/users\/\$\{encodeURIComponent\(uid\)\}\/actions`/.test(clientSrc));
ok("contentAction posts to /content/:type/:id/actions",
    /`\/content\/\$\{type\}\/\$\{encodeURIComponent\(id\)\}\/actions`/.test(clientSrc));
ok("userAction rejects null/undefined uid before any fetch", /INVALID_TARGET_ID/.test(clientSrc));
ok("userAction sends { action } in the body", /body: \{ action, reason/.test(clientSrc));

// 4. frontend carries the user id with the action
const mainSrc = fs.readFileSync("../../control-center/ui/src/main.jsx", "utf8");
ok("user action buttons carry uid in act state", /setAct\(\{ uid: u\.uid, type: "ban"/.test(mainSrc));
ok("runAction validates the target id before calling the API",
    /uid === "null"/.test(mainSrc));

// 5. backend service layer sanity: REVIEW_ACTIONS cover the UI verbs
const svcSrc = fs.readFileSync("moderation/service.js", "utf8");
["approve", "dismiss", "hide", "delete", "restore", "warn", "suspend", "ban"].forEach(function (a) {
    ok("REVIEW_ACTIONS." + a + " defined", Boolean(new RegExp("    " + a + ":").test(svcSrc)));
});
["unsuspend", "unban"].forEach(function (a) {
    ok("REVERSE_ACTIONS." + a + " defined", Boolean(new RegExp("    " + a + ":").test(svcSrc)));
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
