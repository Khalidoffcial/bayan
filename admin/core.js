/**
 * Bayan Control Center — shared infrastructure.
 *
 * Hard rules (Phase 1 contract):
 *  - The admin system has its OWN credential store (user RTDB node
 *    `control_admins`), its OWN JWT secret (ADMIN_JWT_SECRET) and its OWN
 *    sessions — completely independent of the user auth system.
 *  - Nothing here reads or writes user passwords (`psw`) or tokens.
 *  - Audit records are append-only; no module exposes a delete for them.
 *  - No secret is ever returned by any serializer (see sanitize).
 */
const crypto = require("crypto");

// ── Firebase handles are injected (mainServer owns the connections) ──
let H = null;
function initAdmin({ dbUsers, dbContent, cacheGet, cacheSet, io, redisMode }) {
  H = { dbUsers, dbContent, cacheGet, cacheSet, io, redisMode };
}
function handles() {
  if (!H) throw new Error("admin core not initialized");
  return H;
}

// ── Roles & permissions (source of truth; mirrored in RBAC-MATRIX.md) ──
const ROLES = ["super_admin", "admin", "moderator", "analyst", "support"];

const MATRIX = {
  "dashboard.view": { super_admin: 1, admin: 1, moderator: 1, analyst: 1, support: 1 },
  "users.view": { super_admin: 1, admin: 1, moderator: 1, analyst: 0, support: 1 },
  "users.suspend": { super_admin: 1, admin: 1, moderator: 1, analyst: 0, support: 0 },
  "users.ban": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "users.unban": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "users.restrict": { super_admin: 1, admin: 1, moderator: 1, analyst: 0, support: 0 },
  "users.role.change": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "users.delete": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "content.view": { super_admin: 1, admin: 1, moderator: 1, analyst: 1, support: 1 },
  "content.edit": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "content.hide": { super_admin: 1, admin: 1, moderator: 1, analyst: 0, support: 0 },
  "content.delete": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "content.feature": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "content.restore": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "db.read": { super_admin: 1, admin: 1, moderator: 1, analyst: 1, support: 0 },
  "db.write": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "db.delete": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "db.export": { super_admin: 1, admin: 1, moderator: 0, analyst: 1, support: 0 },
  "servers.view": { super_admin: 1, admin: 1, moderator: 0, analyst: 1, support: 0 },
  "logs.view": { super_admin: 1, admin: 1, moderator: 1, analyst: 1, support: 0 },
  "security.view": { super_admin: 1, admin: 1, moderator: 1, analyst: 0, support: 0 },
  "security.action": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "analytics.view": { super_admin: 1, admin: 1, moderator: 0, analyst: 1, support: 0 },
  "monetization.view": { super_admin: 1, admin: 1, moderator: 0, analyst: 1, support: 0 },
  "monetization.manage": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "system.flags": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "system.settings": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "system.maintenance": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "backup.run": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
  "backup.restore": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "admin.manage": { super_admin: 1, admin: 0, moderator: 0, analyst: 0, support: 0 },
  "audit.view": { super_admin: 1, admin: 1, moderator: 0, analyst: 0, support: 0 },
};

function permissionsFor(role) {
  if (!ROLES.includes(role)) return [];
  return Object.keys(MATRIX).filter((p) => MATRIX[p][role] === 1);
}
function can(role, perm) {
  return Boolean(MATRIX[perm] && MATRIX[perm][role] === 1);
}

// ── Sanitization: strip anything sensitive before it leaves the server ──
const SECRET_KEYS = new Set([
  "psw", "pass", "password", "passwordHash", "accessToken", "refreshToken",
  "token", "secret", "apiKey", "api_key", "credential", "serviceAccount",
]);
function deepSanitize(value) {
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.has(k)) continue; // never emitted, never logged
      out[k] = deepSanitize(v);
    }
    return out;
  }
  return value;
}
/** Partial email masking for list views / public display: k******@domain.tld */
function maskEmail(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  const local = s.slice(0, at);
  return `${local[0]}${"*".repeat(Math.max(local.length - 1, 3))}${s.slice(at)}`;
}

// ── Audit (append-only) ──
const AUDIT_ROOT = "control_audit";
async function writeAudit(entry) {
  const { dbUsers, ref, push, set } = handles();
  const record = {
    adminUid: String(entry.adminUid || "system"),
    adminRole: String(entry.adminRole || "system"),
    action: String(entry.action || "").slice(0, 80),
    targetType: String(entry.targetType || "").slice(0, 40),
    targetId: entry.targetId != null ? String(entry.targetId).slice(0, 120) : null,
    ts: Date.now(),
    iso: new Date().toISOString(),
    reason: entry.reason ? String(entry.reason).slice(0, 500) : null,
    ipHash: entry.ip ? hashId(entry.ip) : null,
    success: entry.success !== false,
    ...(entry.before !== undefined ? { before: deepSanitize(entry.before) } : {}),
    ...(entry.after !== undefined ? { after: deepSanitize(entry.after) } : {}),
  };
  const refAud = push(ref(dbUsers, AUDIT_ROOT));
  await set(refAud, record); // append-only by construction
  return record;
}
function hashId(str) {
  return crypto.createHash("sha256").update(String(str) + (process.env.ADMIN_AUDIT_SALT || "")).digest("hex").slice(0, 16);
}

module.exports = {
  initAdmin, handles, ROLES, MATRIX, permissionsFor, can,
  deepSanitize, maskEmail, writeAudit, hashId,
  AUDIT_ROOT,
};
