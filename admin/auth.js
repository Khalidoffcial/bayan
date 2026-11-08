/**
 * Admin authentication middleware.
 *
 * - Verifies ADMIN_JWT (separate secret, 2h TTL) carrying ONLY { uid, sid }.
 * - Loads the admin record + role from `control_admins` in the user DB on
 *   EVERY request — the token never carries the role (no stale escalation).
 * - Validates the server-side session (`control_sessions/{uid}/{sid}`) so
 *   logout/revocation is immediate; sessions expire ≤ token TTL.
 * - Attaches req.admin = { uid, name, email, role, perms }.
 */
const jwt = require("jsonwebtoken");
const core = require("./core");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";
const ADMIN_TTL_SECONDS = Number(process.env.ADMIN_TTL_SECONDS || 7200); // 2h

function signAdminToken(uid, sid) {
  return jwt.sign({ uid, sid }, ADMIN_JWT_SECRET, { expiresIn: ADMIN_TTL_SECONDS, issuer: "bayan-control-center" });
}

async function loadAdmin(uid) {
  const { dbUsers, ref, get } = core.handles();
  const snap = await get(ref(dbUsers, `control_admins/${uid}`));
  if (!snap.exists()) return null;
  const rec = snap.val();
  if (!rec || rec.active === false) return null;
  return {
    uid: String(uid),
    name: String(rec.name || ""),
    email: String(rec.email || ""),
    role: core.ROLES.includes(rec.role) ? rec.role : null,
    perms: core.permissionsFor(rec.role),
  };
}

async function sessionValid(uid, sid) {
  const { dbUsers, ref, get } = core.handles();
  const snap = await get(ref(dbUsers, `control_sessions/${uid}/${sid}`));
  if (!snap.exists()) return false;
  const s = snap.val();
  return Boolean(s) && Number(s.exp || 0) > Date.now() && s.active !== false;
}

/** Express middleware — 401/403 fail-closed. */
async function requireAdmin(req, res, next) {
  try {
    if (!ADMIN_JWT_SECRET) return res.status(503).json({ status: "error", message: "ADMIN_NOT_CONFIGURED" });
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ status: "error", message: "UNAUTHORIZED" });
    let payload;
    try {
      payload = jwt.verify(header.slice(7), ADMIN_JWT_SECRET, { issuer: "bayan-control-center" });
    } catch {
      return res.status(401).json({ status: "error", message: "UNAUTHORIZED" });
    }
    const { uid, sid } = payload || {};
    if (!uid || !sid) return res.status(401).json({ status: "error", message: "UNAUTHORIZED" });

    if (!(await sessionValid(uid, sid))) return res.status(401).json({ status: "error", message: "SESSION_INVALID" });
    const admin = await loadAdmin(uid);
    if (!admin) return res.status(403).json({ status: "error", message: "FORBIDDEN" });

    req.admin = admin;
    req.adminSessionId = sid;
    next();
  } catch (err) {
    console.error("requireAdmin error:", err.message);
    return res.status(500).json({ status: "error", message: "ADMIN_AUTH_ERROR" });
  }
}

/** Requires req.admin to hold the permission; super_admin-only perms are hard-wired. */
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ status: "error", message: "UNAUTHORIZED" });
    if (!core.can(req.admin.role, perm)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    next();
  };
}

module.exports = { requireAdmin, requirePermission, signAdminToken, loadAdmin, sessionValid, ADMIN_TTL_SECONDS };
