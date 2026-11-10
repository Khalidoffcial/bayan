/**
 * SECURITY (P2 prerequisite): server-side verification of Firebase ID tokens.
 *
 * - Verifies signature/issuer/audience/expiry using firebase-admin (official
 *   SDK; x509 JWKS handled internally, cached).
 * - Project_id is taken from the SAME firebaseConfig used by the client SDK
 *   (datastore/firebase.js → chatweb-2e06a) — single source of truth.
 * - Requires an admin app initialized with credentials. On Railway the
 *   recommended path is application default / GOOGLE_APPLICATION_CREDENTIALS,
 *   or FIREBASE_SERVICE_ACCOUNT_JSON. Without any, the module stays DISABLED
 *   and /authGoogle fails closed (503) instead of trusting unverified data.
 * - No secret material is ever logged or returned.
 */
let cachedAuth = null;
let initError = null;

function getProjectId() {
    // Mirrors datastore/firebase.js (single source of truth; no dup config).
    const fs = require("fs");
    const path = require("path");
    try {
        const src = fs.readFileSync(path.join(__dirname, "..", "..", "datastore", "firebase.js"), "utf8");
        const m = src.match(/projectId:\s*"([^"]+)"/);
        if (m) return m[1];
    } catch { /* fall through */ }
    return process.env.FIREBASE_PROJECT_ID || null;
}

function initFirebaseAdmin() {
    if (cachedAuth) return cachedAuth;
    if (initError) throw initError;
    const admin = require("firebase-admin");
    const projectId = getProjectId();
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        credential = admin.credential.cert(svc);
    } else {
        // Works when GOOGLE_APPLICATION_CREDENTIALS / platform ADC is present.
        credential = admin.credential.applicationDefault();
    }
    const app = admin.initializeApp({ credential, projectId }, "bayan-admin-verify");
    cachedAuth = admin.auth(app);
    return cachedAuth;
}

/** Returns decoded claims or throws with a stable error code. */
async function verifyFirebaseIdToken(idToken) {
    if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
        throw Object.assign(new Error("INVALID_ID_TOKEN_FORMAT"), { code: "INVALID_ID_TOKEN" });
    }
    const auth = initFirebaseAdmin();
    const projectId = getProjectId();
    const decoded = await auth.verifyIdToken(idToken, true); // checkRevoked=true
    if (decoded.aud !== projectId) {
        throw Object.assign(new Error("AUDIENCE_MISMATCH"), { code: "INVALID_ID_TOKEN" });
    }
    if (decoded.iss && !String(decoded.iss).includes("securetoken") && !String(decoded.iss).includes(projectId)) {
        throw Object.assign(new Error("ISSUER_MISMATCH"), { code: "INVALID_ID_TOKEN" });
    }
    if (!decoded.uid || !decoded.email) {
        throw Object.assign(new Error("MISSING_CLAIMS"), { code: "INVALID_ID_TOKEN" });
    }
    return { uid: String(decoded.uid), email: String(decoded.email).toLowerCase(), name: decoded.name || null, projectId };
}

module.exports = { verifyFirebaseIdToken, getProjectId, _reset: () => { cachedAuth = null; initError = null; } };
