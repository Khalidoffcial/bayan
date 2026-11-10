/**
 * Bayan Control Center — admin router (Phase 1).
 * Mounted at /admin/api by mainServer.js. See docs/ADMIN-API.md.
 *
 * Phase 1 scope: bootstrap, login, me, logout, health, overview stats,
 * user explorer/details/actions, content explorer/actions, audit list.
 */
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const core = require("./core");
const auth = require("./auth");

const router = express.Router();
// handles() gives live access to db connections after initAdmin()
const H = () => core.handles();
const _rt = () => core.rtdbFns(); const ref=(...a)=>_rt().ref(...a), get=(...a)=>_rt().get(...a), set=(...a)=>_rt().set(...a), update=(...a)=>_rt().update(...a), push=(...a)=>_rt().push(...a), remove=(...a)=>_rt().remove(...a), runTransaction=(...a)=>_rt().runTransaction(...a), query=(...a)=>_rt().query(...a), orderByChild=(...a)=>_rt().orderByChild(...a), equalTo=(...a)=>_rt().equalTo(...a), limitToLast=(...a)=>_rt().limitToLast(...a);

const BOOTSTRAP_TOKEN = process.env.ADMIN_BOOTSTRAP_TOKEN || "";
const SUPER_ADMIN_ROOT = "control_admins";
const SESSION_ROOT = "control_sessions";

// ── simple in-memory rate limiting for admin login ──
const loginAttempts = new Map(); // key → { count, firstAt }
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX = 10;
function loginAllowed(key) {
  const now = Date.now();
  const e = loginAttempts.get(key);
  if (!e || now - e.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return true;
  }
  e.count += 1;
  return e.count <= LOGIN_MAX;
}
function loginFail(key) {
  const now = Date.now();
  const e = loginAttempts.get(key) || { count: 0, firstAt: now };
  e.count += 1;
  loginAttempts.set(key, e);
}

// ── helpers ──
const USER_ROOT = "user_data/Profile";
const CONTENT = { posts: "posts", articles: "articles", novels: "novels" };
const CONTENT_PREFIX = { posts: "posts", articles: "articles", novels: "novels" };

function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 20));
  return { page, pageSize, start: (page - 1) * pageSize };
}

/** mask sensitive user fields for admin display */
function userView(u, uid, { full = false } = {}) {
  if (!u) return null;
  const followers = u.followers || [];
  const following = u.following || [];
  const base = {
    uid: String(uid),
    Id_user: String(u.Id_user ?? uid),
    username: String(u.S_user || ""),
    name: String(u.F_user || ""),
    emailMasked: core.maskEmail(u.email),
    bio: String(u.Bio || ""),
    imgProfile: u.imgProfile || null,
    accountState: String(u.accountState || "active"),
    restrictions: u.restrictions || null,
    counts: {
      followers: Array.isArray(followers) ? followers.length : Object.keys(followers).length,
      following: Array.isArray(following) ? following.length : Object.keys(following).length,
      posts: Array.isArray(u.posts) ? u.posts.length : (u.posts ? Object.keys(u.posts).length : 0),
      articles: Array.isArray(u.articles) ? u.articles.length : (u.articles ? Object.keys(u.articles).length : 0),
      novels: Array.isArray(u.novels) ? u.novels.length : (u.novels ? Object.keys(u.novels).length : 0),
      savedContent: u.savedContent ? Object.keys(u.savedContent).length : 0,
    },
  };
  if (full) {
    // full view is still sanitized — email shown to authorized admins
    base.email = String(u.email || "");
    base.interesting = u.interesting || null;
    base.hasSettings = Boolean(u.settings);
  }
  return base;
}

function listView(u) {
  if (!u) return null;
  return {
    uid: String(u._uid),
    username: String(u.S_user || ""),
    name: String(u.F_user || ""),
    emailMasked: core.maskEmail(u.email),
    accountState: String(u.accountState || "active"),
    counts: u._counts,
  };
}

// ══════════════════════════════════════════════════════════════
// BOOTSTRAP — first Super Admin, secure init (no baked-in password)
// ══════════════════════════════════════════════════════════════
router.post("/bootstrap", async (req, res) => {
  try {
    if (!BOOTSTRAP_TOKEN) return res.status(403).json({ status: "error", message: "BOOTSTRAP_DISABLED" });
    if (req.headers["x-bootstrap-token"] !== BOOTSTRAP_TOKEN) {
      return res.status(403).json({ status: "error", message: "BOOTSTRAP_TOKEN_INVALID" });
    }
    const { email, password, name } = req.body || {};
    if (!email || !password || String(password).length < 10) {
      return res.status(400).json({ status: "error", message: "INVALID_INPUT" });
    }
    const h = H();
    const snap = await get(ref(h.dbUsers, SUPER_ADMIN_ROOT));
    const existing = snap.exists() ? Object.values(snap.val()) : [];
    if (existing.some((a) => a && a.role === "super_admin")) {
      return res.status(409).json({ status: "error", message: "BOOTSTRAP_ALREADY_DONE" });
    }
    const uid = crypto.createHash("sha256").update(String(email).toLowerCase()).digest("hex").slice(0, 24);
    const rec = {
      uid, name: String(name || "").slice(0, 80), email: String(email).toLowerCase().slice(0, 120),
      psw: await bcrypt.hash(String(password), 12), role: "super_admin", active: true, createdAt: new Date().toISOString(),
    };
    await h.set(h.ref(h.dbUsers, `${SUPER_ADMIN_ROOT}/${uid}`), rec);
    await core.writeAudit({ adminUid: uid, adminRole: "super_admin", action: "admin.bootstrap", targetType: "admin", targetId: uid, success: true });
    return res.status(201).json({ status: "ok", uid });
  } catch (err) {
    console.error("admin bootstrap error:", err.message);
    return res.status(500).json({ status: "error", message: "BOOTSTRAP_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// LOGIN / SESSION
// ══════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  const h = H();
  const key = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (process.env.NODE_ENV !== "production" && !process.env.DISABLE_ADMIN_LOGIN_RATE_LIMIT) { /* dev: permissive */ } else if (!loginAllowed(`ip:${key}`)) return res.status(429).json({ status: "error", message: "TOO_MANY_ATTEMPTS" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ status: "error", message: "INVALID_INPUT" });
    const snap = await get(ref(h.dbUsers, SUPER_ADMIN_ROOT));
    const admins = snap.exists() ? Object.values(snap.val()) : [];
    const admin = admins.find((a) => a && String(a.email).toLowerCase() === String(email).toLowerCase() && a.active !== false);
    if (!admin) {
      loginFail(`ip:${key}`);
      await core.writeAudit({ adminUid: "unknown", action: "admin.login.failed", targetType: "admin", targetId: String(email).slice(0, 60), success: false, ip: key });
      return res.status(401).json({ status: "error", message: "INVALID_CREDENTIALS" });
    }
    const ok = await bcrypt.compare(String(password), String(admin.psw || ""));
    if (!ok) {
      loginFail(`ip:${key}`);
      await core.writeAudit({ adminUid: admin.uid, action: "admin.login.failed", targetType: "admin", targetId: admin.uid, success: false, ip: key });
      return res.status(401).json({ status: "error", message: "INVALID_CREDENTIALS" });
    }
    const role = core.ROLES.includes(admin.role) ? admin.role : null;
    if (!role) return res.status(403).json({ status: "error", message: "ROLE_INVALID" });

    const sid = crypto.randomBytes(16).toString("hex");
    const exp = Date.now() + auth.ADMIN_TTL_SECONDS * 1000;
    await set(ref(h.dbUsers, `${SESSION_ROOT}/${admin.uid}/${sid}`), { active: true, exp, createdAt: Date.now(), ipHash: core.hashId(key) });
    loginAttempts.delete(`ip:${key}`);
    await core.writeAudit({ adminUid: admin.uid, adminRole: role, action: "admin.login", targetType: "admin", targetId: admin.uid, success: true, ip: key });
    return res.json({
      status: "ok",
      accessToken: auth.signAdminToken(admin.uid, sid),
      expiresIn: auth.ADMIN_TTL_SECONDS,
      admin: { uid: admin.uid, name: admin.name, email: core.maskEmail(admin.email), role, perms: core.permissionsFor(role) },
    });
  } catch (err) {
    console.error("admin login error:", err.message);
    return res.status(500).json({ status: "error", message: "LOGIN_FAILED" });
  }
});

router.get("/me", auth.requireAdmin, (req, res) => {
  res.json({ status: "ok", admin: req.admin });
});

router.post("/logout", auth.requireAdmin, async (req, res) => {
  try {
    const h = H();
    await set(ref(h.dbUsers, `${SESSION_ROOT}/${req.admin.uid}/${req.adminSessionId}`), null);
    await core.writeAudit({ adminUid: req.admin.uid, adminRole: req.admin.role, action: "admin.logout", targetType: "admin", targetId: req.admin.uid });
    res.json({ status: "ok" });
  } catch (err) {
    console.error("admin logout error:", err.message);
    res.status(500).json({ status: "error", message: "LOGOUT_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// HEALTH — real probes only, no invented numbers
// ══════════════════════════════════════════════════════════════
router.get("/health", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "dashboard.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const h = H();
    const mem = process.memoryUsage();
    const probes = {};
    const probe = async (label, db) => {
      const t0 = Date.now();
      try {
        await get(ref(db, "__probe__"));
        probes[label] = { ok: true, latencyMs: Date.now() - t0 };
      } catch (e) {
        probes[label] = { ok: false, error: e.message?.slice(0, 120) };
      }
    };
    await Promise.all([probe("usersDb", h.dbUsers), probe("contentDb", h.dbContent)]);
    res.json({
      status: "ok",
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: { rssMB: Math.round(mem.rss / 1048576), heapUsedMB: Math.round(mem.heapUsed / 1048576), heapTotalMB: Math.round(mem.heapTotal / 1048576) },
      cache: h.redisMode,
      socketClients: h.io ? h.io.engine.clientsCount : null,
      firebase: probes,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("admin health error:", err.message);
    res.status(500).json({ status: "error", message: "HEALTH_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// OVERVIEW STATS — every metric labeled with its real source
// ══════════════════════════════════════════════════════════════
const STAT_CACHE_TTL = 60;
let statCache = { at: 0, value: null };

router.get("/stats/overview", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "dashboard.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const now = Date.now();
    if (statCache.value && now - statCache.at < STAT_CACHE_TTL * 1000) {
      return res.json({ status: "ok", cached: true, generatedAt: new Date(statCache.at).toISOString(), stats: statCache.value });
    }
    const h = H();
    const usersSnap = await get(ref(h.dbUsers, USER_ROOT));
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const userList = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));
    const postsSnap = await get(ref(h.dbContent, "posts"));
    const articlesSnap = await get(ref(h.dbContent, "articles"));
    const novelsSnap = await get(ref(h.dbContent, "novels"));
    const posts = postsSnap.exists() ? postsSnap.val() : {};
    const articles = articlesSnap.exists() ? articlesSnap.val() : {};
    const novels = novelsSnap.exists() ? novelsSnap.val() : {};
    const postList = Object.values(posts).filter(Boolean);
    const commentCount = postList.filter((p) => p && p.comment_on).length;
    const likesSum = postList.reduce((s, p) => s + (Number(p.likesCount || p.likes) || 0), 0);
    const viewsSum = postList.reduce((s, p) => s + (Number(p.views) || 0), 0)
      + Object.values(articles).reduce((s, p) => s + (Number(p.views) || 0), 0)
      + Object.values(novels).reduce((s, p) => s + (Number(p.views) || 0), 0);
    const savedUsers = userList.filter((u) => u.savedContent).length;
    const doabSnap = await get(ref(h.dbContent, "books_index/doab/meta")).catch(() => null);
    const booksIndexed = doabSnap && doabSnap.exists() ? Number(doabSnap.val()?.itemCount) || 0 : 0;

    const stats = {
      users: { value: userList.length, source: "chatweb-2e06a user_data/Profile", updatedAt: new Date().toISOString() },
      activeAccounts: { value: userList.filter((u) => String(u.accountState || "active") === "active").length, source: "user_data/Profile/accountState" },
      posts: { value: postList.filter((p) => !p.comment_on).length, source: "tiaralamal posts" },
      articles: { value: Object.keys(articles).length, source: "tiaralamal articles" },
      novels: { value: Object.keys(novels).length, source: "tiaralamal novels" },
      commentsReplies: { value: commentCount, source: "posts records flagged comment_on" },
      likes: { value: likesSum, source: "posts.likesCount aggregate" },
      flowViews: { value: viewsSum, source: "per-content views counters" },
      usersWithSavedContent: { value: savedUsers, source: "user_data/Profile/*/savedContent" },
      booksIndexed: { value: booksIndexed, source: "books_index/doab/meta.itemCount" },
      // Honest gaps — no trustworthy source exists in the current schema:
      newUsersToday: { available: false, reason: "no createdAt timestamps on user records (see ARCHITECTURE-MAP §8); accumulation starts after Phase-1 deploy" },
      premiumUsers: { available: false, reason: "no subscription data exists anywhere in the platform" },
      revenue: { available: false, reason: "no payment provider integration; no verified data source" },
      totalSpaces: { available: false, reason: "no Spaces feature detected in codebase" },
    };
    statCache = { at: now, value: stats };
    res.json({ status: "ok", cached: false, generatedAt: new Date(now).toISOString(), stats });
  } catch (err) {
    console.error("admin stats error:", err.message);
    res.status(500).json({ status: "error", message: "STATS_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// USERS — explorer, details, actions
// ══════════════════════════════════════════════════════════════
router.get("/users", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "users.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const h = H();
    const { page, pageSize, start } = pageParams(req);
    const search = String(req.query.search || "").toLowerCase().slice(0, 80);
    const status = String(req.query.status || "").toLowerCase();
    const sort = String(req.query.sort || "uid");

    const snap = await get(ref(h.dbUsers, USER_ROOT));
    const raw = snap.exists() ? snap.val() : {};
    let rows = Object.entries(raw).map(([uid, u]) => {
      const followers = u.followers || [];
      const following = u.following || [];
      return {
        _uid: uid, ...u,
        _counts: {
          followers: Array.isArray(followers) ? followers.length : Object.keys(followers || {}).length,
          following: Array.isArray(following) ? following.length : Object.keys(following || {}).length,
          posts: Array.isArray(u.posts) ? u.posts.length : 0,
          articles: Array.isArray(u.articles) ? u.articles.length : 0,
          novels: Array.isArray(u.novels) ? u.novels.length : 0,
        },
      };
    });
    if (search) {
      rows = rows.filter((u) =>
        String(u.S_user || "").toLowerCase().includes(search) ||
        String(u.F_user || "").toLowerCase().includes(search) ||
        String(u.Id_user || "").includes(search) ||
        String(u._uid).includes(search) ||
        String(u.email || "").toLowerCase().includes(search));
    }
    if (status) rows = rows.filter((u) => String(u.accountState || "active") === status);
    if (sort === "followers") rows.sort((a, b) => b._counts.followers - a._counts.followers);
    else if (sort === "username") rows.sort((a, b) => String(a.S_user).localeCompare(String(b.S_user)));
    else rows.sort((a, b) => String(a._uid).localeCompare(String(b._uid)));

    const total = rows.length;
    const items = rows.slice(start, start + pageSize).map(listView);
    res.json({ status: "ok", page, pageSize, total, totalPages: Math.ceil(total / pageSize), items });
  } catch (err) {
    console.error("admin users list error:", err.message);
    res.status(500).json({ status: "error", message: "USERS_FAILED" });
  }
});

router.get("/users/:uid", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "users.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const h = H();
    const snap = await get(ref(h.dbUsers, `${USER_ROOT}/${req.params.uid}`));
    if (!snap.exists()) return res.status(404).json({ status: "error", message: "USER_NOT_FOUND" });
    res.json({ status: "ok", user: userView(snap.val(), req.params.uid, { full: true }) });
  } catch (err) {
    console.error("admin user detail error:", err.message);
    res.status(500).json({ status: "error", message: "USER_FAILED" });
  }
});

const USER_ACTIONS = {
  suspend: { perm: "users.suspend", state: "suspended" },
  unsuspend: { perm: "users.suspend", state: "active" },
  ban: { perm: "users.ban", state: "banned" },
  unban: { perm: "users.unban", state: "active" },
};

router.post("/users/:uid/actions", auth.requireAdmin, async (req, res) => {
  try {
    const { action, reason } = req.body || {};
    const spec = USER_ACTIONS[action];
    if (!spec) return res.status(400).json({ status: "error", message: "UNKNOWN_ACTION" });
    if (!core.can(req.admin.role, spec.perm)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    if (!reason || String(reason).trim().length < 5) return res.status(400).json({ status: "error", message: "REASON_REQUIRED" });
    if (req.params.uid === req.admin.uid) return res.status(400).json({ status: "error", message: "CANNOT_TARGET_SELF" });

    const h = H();
    const userRef = ref(h.dbUsers, `${USER_ROOT}/${req.params.uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) return res.status(404).json({ status: "error", message: "USER_NOT_FOUND" });
    const before = { accountState: String(snap.val().accountState || "active") };
    const after = { accountState: spec.state, accountStateUpdatedAt: new Date().toISOString(), accountStateBy: req.admin.uid };

    // Audit BEFORE the mutation lands — fail-closed for privileged verbs.
    try {
      await core.writeAudit({
        adminUid: req.admin.uid, adminRole: req.admin.role, action: `users.${action}`,
        targetType: "user", targetId: req.params.uid, reason, ip: req.ip, before, after,
      });
    } catch (auditErr) {
      console.error("audit write failed — refusing mutation:", auditErr.message);
      return res.status(500).json({ status: "error", message: "AUDIT_FAILED" });
    }
    await update(userRef, after);
    return res.json({ status: "ok", uid: req.params.uid, ...after });
  } catch (err) {
    console.error("admin user action error:", err.message);
    res.status(500).json({ status: "error", message: "ACTION_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// CONTENT — explorer + safe actions
// ══════════════════════════════════════════════════════════════
router.get("/content/:type", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "content.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const type = String(req.params.type);
    if (!CONTENT[type]) return res.status(400).json({ status: "error", message: "UNKNOWN_TYPE" });
    const h = H();
    const { page, pageSize, start } = pageParams(req);
    const search = String(req.query.search || "").toLowerCase().slice(0, 80);

    const snap = await get(ref(h.dbContent, type));
    const raw = snap.exists() ? snap.val() : {};
    let rows = Object.entries(raw).map(([key, r]) => ({ _key: key, ...r }));
    if (search) {
      rows = rows.filter((r) =>
        String(r.title || "").toLowerCase().includes(search) ||
        String(r.content || "").toLowerCase().includes(search) ||
        String(r.id || "").includes(search));
    }
    rows.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    const total = rows.length;
    const items = rows.slice(start, start + pageSize).map((r) => ({
      id: String(r.id ?? r._key),
      key: r._key,
      type,
      title: String(r.title || (type === "posts" ? (r.content || "").slice(0, 80) : "")).slice(0, 120),
      authorId: String(r.autherID || ""),
      hidden: Boolean(r.hidden),
      featured: Boolean(r.featured),
      isReply: Boolean(r.comment_on),
      likes: Number(r.likesCount || r.likes) || 0,
      views: Number(r.views) || 0,
      timestamp: Number(r.timestamp) || null,
      date: r.date || null,
    }));
    res.json({ status: "ok", page, pageSize, total, totalPages: Math.ceil(total / pageSize), items });
  } catch (err) {
    console.error("admin content list error:", err.message);
    res.status(500).json({ status: "error", message: "CONTENT_FAILED" });
  }
});

const CONTENT_ACTIONS = {
  hide: { perm: "content.hide", flag: { hidden: true } },
  restore: { perm: "content.restore", flag: { hidden: false } },
  feature: { perm: "content.feature", flag: { featured: true } },
  unfeature: { perm: "content.feature", flag: { featured: false } },
};

router.post("/content/:type/:id/actions", auth.requireAdmin, async (req, res) => {
  try {
    const { action, reason } = req.body || {};
    const type = String(req.params.type);
    const id = String(req.params.id);
    if (!CONTENT[type]) return res.status(400).json({ status: "error", message: "UNKNOWN_TYPE" });

    let spec = CONTENT_ACTIONS[action];
    let deleting = false;
    if (action === "delete") { spec = { perm: "content.delete" }; deleting = true; }
    if (!spec) return res.status(400).json({ status: "error", message: "UNKNOWN_ACTION" });
    if (!core.can(req.admin.role, spec.perm)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    if (!reason || String(reason).trim().length < 5) return res.status(400).json({ status: "error", message: "REASON_REQUIRED" });

    const h = H();
    // The real key layout: posts/posts{id}, articles/articles{id}, novels/novels{id}
    const recordPath = `${type}/${CONTENT_PREFIX[type]}${id}`;
    const snap = await get(ref(h.dbContent, recordPath));
    if (!snap.exists()) return res.status(404).json({ status: "error", message: "CONTENT_NOT_FOUND" });
    const record = snap.val();
    const before = deleting ? undefined : { hidden: Boolean(record.hidden), featured: Boolean(record.featured) };
    const after = deleting ? undefined : spec.flag;

    try {
      await core.writeAudit({
        adminUid: req.admin.uid, adminRole: req.admin.role, action: `content.${action}`,
        targetType: type, targetId: id, reason, ip: req.ip, before, after,
        ...(deleting ? { after: { title: String(record.title || "").slice(0, 120), authorId: String(record.autherID || "") } } : {}),
      });
    } catch (auditErr) {
      console.error("audit write failed — refusing mutation:", auditErr.message);
      return res.status(500).json({ status: "error", message: "AUDIT_FAILED" });
    }

    if (deleting) {
      await remove(ref(h.dbContent, recordPath));
      if (type === "posts") { try { await remove(ref(h.dbContent, `replyIndex/${id}`)); } catch { /* best-effort */ } }
      if (h.io) { try { h.io.emit("CONTENT_DELETED", { contentType: type, id }); } catch { /* best-effort */ } }
    } else {
      await update(ref(h.dbContent, recordPath), after);
    }
    res.json({ status: "ok", action, type, id });
  } catch (err) {
    console.error("admin content action error:", err.message);
    res.status(500).json({ status: "error", message: "ACTION_FAILED" });
  }
});

// ══════════════════════════════════════════════════════════════
// AUDIT — append-only, read-only API
// ══════════════════════════════════════════════════════════════
router.get("/audit", auth.requireAdmin, async (req, res) => {
  try {
    if (!core.can(req.admin.role, "audit.view")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
    const h = H();
    const { page, pageSize, start } = pageParams(req);
    const action = String(req.query.action || "").slice(0, 40);
    const adminUid = String(req.query.admin || "").slice(0, 40);
    const snap = await get(ref(h.dbUsers, core.AUDIT_ROOT));
    let rows = snap.exists() ? Object.values(snap.val()) : [];
    if (action) rows = rows.filter((r) => String(r.action || "").includes(action));
    if (adminUid) rows = rows.filter((r) => String(r.adminUid) === adminUid);
    rows.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
    const total = rows.length;
    res.json({ status: "ok", page, pageSize, total, totalPages: Math.ceil(total / pageSize), items: rows.slice(start, start + pageSize) });
  } catch (err) {
    console.error("admin audit list error:", err.message);
    res.status(500).json({ status: "error", message: "AUDIT_FAILED" });
  }
});


// MODERATION - multilingual content moderation + Reason Library.
// Mounted under /admin/api/moderation/*; every route requires a valid// admin session (requireAdmin) AND per-route core.can RBAC checks.
module.exports = router;
