/**
 * Google sign-in security regression (P2 prerequisite).
 * Static + unit assertions; no live Firebase calls.
 * Run: node tests/googleAuthSecurity.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
let pass = 0, fail = 0;
const t = (name, fn) => {
    try { fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
};

const src = fs.readFileSync(path.join(__dirname, "..", "mainServer.js"), "utf8");
const verifier = fs.readFileSync(path.join(__dirname, "..", "admin", "firebaseIdToken.js"), "utf8");
const feSvc = fs.readFileSync(
    path.join(__dirname, "fe", "auth.service.js"),
    "utf8"
);

console.log("Server-side verification:");
t("/authGoogle requires idToken (no idToken → 400)", () => {
    assert.ok(src.includes('if (!idToken) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Missing idToken" })'));
});
t("/authGoogle verifies idToken BEFORE any user lookup/JWT", () => {
    const route = src.slice(src.indexOf('app.post("/authGoogle"'), src.indexOf('app.post("/authGoogle"') + 3000);
    const vIdx = route.indexOf("verifyFirebaseIdToken(idToken)");
    const lookupIdx = route.indexOf("findUserByEmailAndUid");
    const tokenIdx = route.indexOf("generateToken(payload)");
    assert.ok(vIdx > 0 && lookupIdx > vIdx && tokenIdx > lookupIdx, "order must be verify → lookup → issue");
});
t("uid/email come from VERIFIED claims, never from req.body", () => {
    const route = src.slice(src.indexOf('app.post("/authGoogle"'), src.indexOf('app.post("/authGoogle"') + 3000);
    assert.ok(!route.includes("req.body.email"), "must not read email from body");
    assert.ok(!route.includes("req.body.uid"), "must not read uid from body");
    assert.ok(route.includes("claims.email") && route.includes("claims.uid"));
});
t("verifier enforces audience = bayan project id", () => {
    assert.ok(verifier.includes("decoded.aud !== projectId"));
});
t("verifier checks issuer (securetoken/google)", () => {
    assert.ok(verifier.includes("ISSUER_MISMATCH"));
});
t("verifier enforces expiry/revocation (verifyIdToken checkRevoked=true)", () => {
    assert.ok(verifier.includes("verifyIdToken(idToken, true)"));
});
t("admin SDK not configured → 503 fail-closed (not silently accepted)", () => {
    assert.ok(src.includes("GOOGLE_AUTH_UNAVAILABLE"));
});
t("idToken size bounded (DoS guard)", () => {
    assert.ok(verifier.includes("idToken.length > 4096"));
});
t("email lowercased before DB match", () => {
    assert.ok(verifier.includes(".toLowerCase()"));
});

console.log("Frontend contract:");
t("client sends idToken with the authGoogle call", () => {
    assert.ok(feSvc.includes("getIdToken()"));
    assert.ok(feSvc.includes("idToken,"));
});
t("comment documents that body claims are advisory only", () => {
    assert.ok(feSvc.includes("are IGNORED by the") || feSvc.includes("IGNORED by the server"));
});

console.log("Legacy regression:");
t("email/password and signup flows untouched by this change", () => {
    assert.ok(src.includes('app.post("/signin", loginRateLimit'));
    assert.ok(src.includes("sign.logup_user_Insert("));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
