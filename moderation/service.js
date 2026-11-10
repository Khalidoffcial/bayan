/**
 * Bayan — moderation workflow service.
 * Owns: moderation cases, enforcement policy, admin review actions,
 * user-facing notifications, appeal flow, RBAC wiring, audit integration.
 *
 * DB layout (Firebase RTDB — user DB unless noted):
 *  control_moderation/cases/{caseId}          — one record per detection
 *  control_moderation/cases/{caseId}/history  — append-only action history
 *  control_moderation/dictionary/{entryId}    — word/phrase entries
 *  control_moderation/categories/{catId}      — violation categories
 *  control_moderation/reasons/{reasonId}      — Admin Reason Library templates
 *  control_moderation/appeals/{appealId}      — user appeals
 *  control_moderation/alerts/{adminUid}/{id}  — per-admin dashboard alerts
 *  user_data/Profile/{uid}/moderation_notifs/{id} — user-facing notifications
 *  control_audit/…                            — existing append-only audit
 */
"use strict";
const core = require("../admin/core");
const engine = require("./engine");
const { CATEGORIES, DICTIONARY_SEED, REASON_TEMPLATES } = require("./seed");

function rt() { return core.rtdbFns(); }
function h() { return core.handles(); }
const loc = (o, lang) => (o && (o[lang] ?? o.en)) || "";

// ── Config (server-side defaults; admin-tunable via control_moderation/config) ──
const DEFAULT_CONFIG = {
    enabled: true,
    contentTypes: ["posts", "articles", "novels", "comments"],
    policy: {
        low: { action: "flag" },                                   // review only
        medium: { action: "flag", restrictVisibility: false },         // optional hide pending review
        high: { action: "flag", restrictVisibility: false, autoSuspendHours: 0 }, // suspended-acc only by explicit admin config
    },
};

async function loadConfig() {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/config"));
    return snap.exists() ? { ...DEFAULT_CONFIG, ...snap.val() } : DEFAULT_CONFIG;
}
async function saveConfig(patch) {
    const { ref, update } = rt();
    await update(ref(h().dbUsers, "control_moderation/config"), patch);
    return loadConfig();
}

// ── Seeding (idempotent; seeds only missing records) ──────────────────────
async function ensureSeeded() {
    const { ref, get, set } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/seeded"));
    if (snap.exists() && snap.val() === true) return;
    const now = Date.now();
    for (const c of CATEGORIES) {
        await set(ref(h().dbUsers, `control_moderation/categories/${c.id}`), {
            id: c.id, severity: c.severity, langs: c.langs, name: c.name,
            description: c.description || null, enabled: true, createdAt: now,
        });
    }
    for (const e of DICTIONARY_SEED) {
        await set(ref(h().dbUsers, `control_moderation/dictionary/${e.id}`), {
            ...e, createdBy: "system", createdAt: now, updatedAt: now,
        });
    }
    for (const r of REASON_TEMPLATES) {
        await set(ref(h().dbUsers, `control_moderation/reasons/${r.id}`), {
            ...r, createdBy: "system", createdAt: now, updatedAt: now,
        });
    }
    await set(ref(h().dbUsers, "control_moderation/seeded"), true);
}

// ── Dictionary CRUD ────────────────────────────────────────────────────────
async function listDictionary() {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/dictionary"));
    const val = snap.exists() ? snap.val() : {};
    return Object.entries(val).map(([k, v]) => ({ id: k, ...v }));
}
async function upsertDictionaryEntry(admin, data) {
    const { ref, set, push, get } = rt();
    const term = String(data.term || "").trim().slice(0, 120);
    if (!term) throw new Error("TERM_REQUIRED");
    const lang = String(data.lang || "any").slice(0, 5);
    const categoryId = String(data.categoryId || "custom").slice(0, 40);
    const severity = Math.min(5, Math.max(1, Number(data.severity) || 2));
    const match = ["word", "phrase", "exact", "squashed"].includes(data.match) ? data.match : "word";
    const now = Date.now();
    if (data.id) {
        const snap = await get(ref(h().dbUsers, `control_moderation/dictionary/${data.id}`));
        if (!snap.exists()) throw new Error("ENTRY_NOT_FOUND");
        await set(ref(h().dbUsers, `control_moderation/dictionary/${data.id}`), { ...snap.val(), term, lang, categoryId, severity, match, enabled: data.enabled !== false, updatedBy: admin.uid, updatedAt: now });
        return data.id;
    }
    const r = push(ref(h().dbUsers, "control_moderation/dictionary"));
    await set(r, { term, lang, categoryId, severity, match, enabled: data.enabled !== false, createdBy: admin.uid, createdAt: now, updatedAt: now });
    return r.key;
}
async function setDictionaryEntryEnabled(admin, id, enabled) {
    const { ref, update } = rt();
    await update(ref(h().dbUsers, `control_moderation/dictionary/${id}`), { enabled: Boolean(enabled), updatedBy: admin.uid, updatedAt: Date.now() });
}
async function deleteDictionaryEntry(id) {
    const { ref, remove } = rt();
    await remove(ref(h().dbUsers, `control_moderation/dictionary/${id}`));
}

// ── Reason Library CRUD ────────────────────────────────────────────────────
async function listReasons() {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/reasons"));
    const val = snap.exists() ? snap.val() : {};
    return Object.entries(val).map(([k, v]) => ({ id: k, ...v }));
}
async function renderReason(id, lang, vars = {}) {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, `control_moderation/reasons/${id}`));
    if (!snap.exists()) throw new Error("REASON_NOT_FOUND");
    const r = snap.val();
    if (r.enabled === false) throw new Error("REASON_DISABLED");
    const title = String(loc(r.title, lang) || r.title?.en || id);
    const explanation = String(loc(r.explanation, lang) || r.explanation?.en || "");
    const fill = (s) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]).slice(0, 200) : `{${k}}`));
    return { id, title: fill(title), explanation: fill(explanation), category: r.category || null };
}

// ── Scanning (invoked from content write paths) ────────────────────────────
function extractText(record, type) {
    if (!record || typeof record !== "object") return "";
    if (type === "articles" || type === "novels") return [record.title, record.content, record.description].filter(Boolean).join("\n");
    if (type === "posts") return [record.content, record.title].filter(Boolean).join("\n");
    if (type === "comments") return [record.content, record.comment_text, record.text].filter(Boolean).join("\n");
    return JSON.stringify(record).slice(0, 20000);
}

/** Scan submitted content; creates a moderation case when matches are found. */
async function scanAndFlag({ type, id, record, authorId, originalContentPath }) {
    const config = await loadConfig();
    if (!config.enabled || !config.contentTypes.includes(type)) return null;
    const text = extractText(record, type);
    if (!text.trim()) return null;
    const entries = await listDictionary();
    const result = engine.scan(text, { entries });
    // Guarded-only, low-severity noise (possible educational/quote context):
    // don't create a case — reduces false-positive workload.
    if (!result.matches.length || (result.maxSeverity === 0 && result.matches.every((m) => m.guarded))) return null;

    const { ref, get, set, push, update } = rt();
    const caseId = `mc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const category = Object.entries(result.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "custom";
    const severity = result.maxSeverity;
    const matchedTerms = result.matches.slice(0, 20).map((m) => ({
        entryId: m.entry.id || null, term: m.entry.term, categoryId: m.entry.categoryId,
        severity: m.effectiveSeverity, method: m.method, guarded: Boolean(m.guarded), pos: m.pos,
    }));
    const guardedOnly = result.contextGuarded > 0 && severity <= 1;

    const rec = {
        id: caseId,
        contentType: type,
        contentId: String(id),
        contentPath: originalContentPath || `${type}/${type}${id}`,
        authorId: String(authorId || ""),
        language: result.language,
        categories: result.categories,
        primaryCategory: category,
        severity,
        maxRawSeverity: result.maxSeverity,
        matchedTerms,
        contextGuarded: result.contextGuarded,
        evidencePreview: text.slice(0, 280),
        status: "pending",            // pending | reviewed | dismissed | actioned
        guardedOnly,
        detectionMethod: "dictionary+normalization",
        detectedAt: now,
        detectedIso: new Date().toISOString(),
        actionsTaken: [],
    };

    // Dedup: don't re-create a case for identical content+terms.
    const existingSnap = await get(ref(h().dbUsers, "control_moderation/cases"));
    const existing = existingSnap.exists() ? Object.values(existingSnap.val()) : [];
    const dup = existing.find((c) => c.contentId === rec.contentId && c.contentType === type &&
        c.primaryCategory === rec.primaryCategory && (c.status === "pending" || c.status === "actioned"));
    if (dup) return { caseId: dup.id, deduplicated: true };

    await set(ref(h().dbUsers, `control_moderation/cases/${caseId}`), rec);

    // Policy (config-driven, conservative — no auto-ban, no auto-delete)
    const band = severity >= 5 ? "high" : severity >= 3 ? "medium" : "low";
    const pol = (config.policy && config.policy[band]) || DEFAULT_CONFIG.policy[band];
    if (pol.action === "flag" && pol.restrictVisibility && !guardedOnly) {
        try {
            const target = ref(h().dbContent, rec.contentPath);
            await update(target, { hidden: true, hiddenByModeration: true, hiddenPendingReview: true });
            rec.actionsTaken.push({ action: "hidden_pending_review", at: now, by: "policy" });
            await update(ref(h().dbUsers, `control_moderation/cases/${caseId}`), { actionsTaken: rec.actionsTaken });
        } catch (e) { console.error("moderation visibility restrict failed:", e.message); }
    }

    // Dashboard alerts (dedup per case — one alert per admin per case)
    try { await createAdminAlerts(caseId, rec); } catch (e) { console.error("moderation alert failed:", e.message); }
    return { caseId, severity, language: result.language, matchedCount: matchedTerms.length, guardedOnly };
}

/** Fan-out alert to admins who can review. One alert per admin per case. */
async function createAdminAlerts(caseId, rec) {
    const { dbUsers, ref, get, set, push } = h();
    const adminsSnap = await get(ref(dbUsers, "control_admins"));
    const admins = adminsSnap.exists() ? Object.entries(adminsSnap.val()) : [];
    const eligible = admins.filter(([, a]) => a && a.active !== false && core.can(a.role, "content.view"));
    for (const [uid] of eligible) {
        const alertId = `alert_${uid}_${caseId}`;
        await set(ref(dbUsers, `control_moderation/alerts/${uid}/${alertId}`), {
            id: alertId, caseId, contentType: rec.contentType, contentId: rec.contentId,
            severity: rec.severity, primaryCategory: rec.primaryCategory, language: rec.language,
            read: false, createdAt: rec.detectedAt, dedupKey: caseId,
        });
    }
}

// ── Case listing / detail ──────────────────────────────────────────────────
function caseView(c, { includeEvidence = true } = {}) {
    if (!c) return null;
    const base = {
        id: c.id, contentType: c.contentType, contentId: c.contentId, contentPath: c.contentPath,
        authorId: c.authorId, language: c.language, primaryCategory: c.primaryCategory,
        categories: c.categories || {}, severity: Number(c.severity) || 0,
        status: c.status, guardedOnly: Boolean(c.guardedOnly), detectedAt: c.detectedAt,
        detectedIso: c.detectedIso, actionsTaken: c.actionsTaken || [], appeal: c.appeal || null,
        contextGuarded: Number(c.contextGuarded) || 0,
    };
    if (includeEvidence) base.matchedTerms = c.matchedTerms || [];
    return base;
}
async function listCases(filters = {}) {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/cases"));
    let rows = snap.exists() ? Object.values(snap.val()) : [];
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    if (filters.language) rows = rows.filter((r) => r.language === filters.language);
    if (filters.category) rows = rows.filter((r) => r.primaryCategory === filters.category);
    if (filters.contentType) rows = rows.filter((r) => r.contentType === filters.contentType);
    if (filters.severity) rows = rows.filter((r) => Number(r.severity) === Number(filters.severity));
    if (filters.authorId) rows = rows.filter((r) => r.authorId === filters.authorId);
    if (filters.from) rows = rows.filter((r) => Number(r.detectedAt) >= Number(filters.from));
    if (filters.to) rows = rows.filter((r) => Number(r.detectedAt) <= Number(filters.to));
    rows.sort((a, b) => Number(b.detectedAt || 0) - Number(a.detectedAt || 0));
    return rows;
}
async function getCase(id) {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, `control_moderation/cases/${id}`));
    return snap.exists() ? snap.val() : null;
}

// ── Content preview (from the content DB) ─────────────────────────────────
async function contentPreview(contentType, contentId) {
    const { dbContent, ref, get } = h();
    const path = `${contentType}/${contentType}${contentId}`;
    const snap = await get(ref(dbContent, path));
    if (!snap.exists()) return null;
    const r = snap.val();
    return {
        path, title: String(r.title || "").slice(0, 160) || null,
        excerpt: String(r.content || "").slice(0, 600),
        authorId: String(r.autherID || ""), hidden: Boolean(r.hidden),
        featured: Boolean(r.featured), ts: Number(r.ts || r.timestamp) || null,
    };
}

// ── User notifications (Bayan user DB; privacy-safe, localized) ────────────
const USER_NOTIF_TITLES = {
    "content.deleted": { ar: "تم حذف المحتوى الخاص بك", en: "Your content was removed" },
    "content.hidden": { ar: "تم إخفاء المحتوى الخاص بك", en: "Your content was hidden" },
    "content.restored": { ar: "تم استرجاع المحتوى الخاص بك", en: "Your content was restored" },
    "content.approved": { ar: "تمت الموافقة على المحتوى الخاص بك", en: "Your content was approved" },
    "user.warned": { ar: "تحذير رسمي من فريق الإشراف", en: "Official warning from the moderation team" },
    "user.suspended": { ar: "تم تعليق حسابك مؤقتًا", en: "Your account was temporarily suspended" },
    "user.banned": { ar: "تم حظر حسابك", en: "Your account was banned" },
    "user.unsuspended": { ar: "تم إلغاء تعليق حسابك", en: "Your account suspension was lifted" },
    "user.unbanned": { ar: "تم رفع الحظر عن حسابك", en: "Your account ban was lifted" },
    "appeal.received": { ar: "تم استلام اعتراضك", en: "Your appeal was received" },
    "appeal.approved": { ar: "تم قبول اعتراضك", en: "Your appeal was approved" },
    "appeal.rejected": { ar: "تم رفض اعتراضك", en: "Your appeal was rejected" },
};
const GUIDELINES_LINK = "/community-guidelines";

/** Notification for the affected user only — no internal notes, no other-user data. */
async function notifyUser({ userId, type, lang = "ar", reasonText, caseId, contentRef }) {
    if (!userId || !USER_NOTIF_TITLES[type]) throw new Error("BAD_NOTIFICATION");
    const { dbUsers, ref, push, set } = h();
    const now = Date.now();
    const title = USER_NOTIF_TITLES[type][lang] || USER_NOTIF_TITLES[type].en;
    const notif = {
        type, title,
        explanation: String(reasonText || "").slice(0, 500), // rendered, user-facing reason only
        timestamp: now,
        iso: new Date(now).toISOString(),
        caseId: caseId || null,
        contentRef: contentRef ? String(contentRef).slice(0, 120) : null,
        guidelinesLink: GUIDELINES_LINK,
        appealUrl: `/appeals/new?case=${encodeURIComponent(caseId || "")}`,
        read: false,
    };
    const r = push(ref(dbUsers, `user_data/Profile/${userId}/moderation_notifs`));
    await set(r, notif);
    return { id: r.key, ...notif };
}

// ── Audit (extends existing core.writeAudit with moderation fields) ────────
async function auditModeration(admin, { action, targetType, targetId, caseId, reasonId, reasonText, internalNote, outcome }) {
    return core.writeAudit({
        adminUid: admin.uid, adminRole: admin.role, action,
        targetType: targetType || "moderation_case",
        targetId: caseId || targetId,
        reason: reasonText ? `${reasonId ? `[${reasonId}] ` : ""}${reasonText}`.slice(0, 500) : null,
        ip: null, before: caseId ? { caseId } : undefined,
        after: outcome ? { outcome } : undefined,
    });
}

// ── Review actions (single entry point; server-side RBAC enforced upstream) ──
const REVIEW_ACTIONS = {
    approve: { perm: "content.view", userNotif: "content.approved", caseStatus: "actioned" },
    dismiss: { perm: "content.view", userNotif: null, caseStatus: "dismissed" }, // no user notif on false positive
    hide: { perm: "content.hide", userNotif: "content.hidden", caseStatus: "actioned", contentFlag: { hidden: true, hiddenByModeration: true } },
    delete: { perm: "content.delete", userNotif: "content.deleted", caseStatus: "actioned", deleteContent: true },
    restore: { perm: "content.restore", userNotif: "content.restored", caseStatus: "actioned", contentFlag: { hidden: false, hiddenByModeration: false } },
    warn: { perm: "users.restrict", userNotif: "user.warned", caseStatus: "actioned" },
    suspend: { perm: "users.suspend", userNotif: "user.suspended", caseStatus: "actioned", accountState: "suspended" },
    ban: { perm: "users.ban", userNotif: "user.banned", caseStatus: "actioned", accountState: "banned" },
};
const REVERSE_ACTIONS = {
    unsuspend: { perm: "users.suspend", userNotif: "user.unsuspended", accountState: "active", reverses: "suspend" },
    unban: { perm: "users.unban", userNotif: "user.unbanned", accountState: "active", reverses: "ban" },
};

/** Idempotency: per-admin in-process lock on (admin, case, action). */
const _recentActions = new Map(); // `${caseId}|${action}` → ts
function checkDuplicate(adminUid, caseId, action) {
    const k = `${caseId}|${action}`;
    const last = _recentActions.get(k);
    if (last && Date.now() - last < 10000) return false;
    _recentActions.set(k, Date.now());
    if (_recentActions.size > 500) for (const [key, v] of _recentActions) if (Date.now() - v > 60000) _recentActions.delete(key);
    return true;
}

/**
 * Apply a review action.
 * @returns updated case record
 */
async function applyReviewAction({ admin, caseId, action, reasonId, reasonText, internalNote, lang = "ar", vars = {} }) {
    const spec = REVIEW_ACTIONS[action];
    if (!spec) throw new Error("UNKNOWN_ACTION");
    if (!core.can(admin.role, spec.perm)) { const e = new Error("FORBIDDEN"); e.status = 403; throw e; }
    if (!checkDuplicate(admin.uid, caseId, action)) throw new Error("DUPLICATE_ACTION");

    // Reason REQUIRED — either a template ID or a custom reason text.
    const hasTemplate = reasonId && reasonId !== "custom";
    if (!hasTemplate && (!reasonText || String(reasonText).trim().length < 5)) throw new Error("REASON_REQUIRED");
    const rendered = hasTemplate ? await renderReason(reasonId, lang, vars) : { id: "custom", title: String(reasonText).trim(), explanation: String(reasonText).trim() };
    const userFacing = rendered.explanation || rendered.title;

    const c = await getCase(caseId);
    if (!c) throw new Error("CASE_NOT_FOUND");

    const now = Date.now();
    // 1) Content mutation
    if (spec.contentFlag || spec.deleteContent) {
        const { dbContent, ref, get, update, remove } = h();
        const cref = ref(dbContent, c.contentPath);
        const snap = await get(cref);
        if (spec.deleteContent) {
            if (snap.exists()) await remove(cref);
        } else if (snap.exists()) {
            await update(cref, spec.contentFlag);
        }
    }
    // 2) Account mutation
    if (spec.accountState) {
        const { dbUsers, ref, get, update } = h();
        const uref = ref(dbUsers, `user_data/Profile/${c.authorId}`);
        const usnap = await get(uref);
        if (usnap.exists()) {
            await update(uref, { accountState: spec.accountState, accountStateUpdatedAt: new Date(now).toISOString(), accountStateBy: admin.uid });
        }
    }
    // 3) Case history (append-only inside the case record)
    const entry = {
        action, by: admin.uid, byRole: admin.role, reasonId: rendered.id,
        reasonText: rendered.title, internalNote: internalNote ? String(internalNote).slice(0, 500) : null,
        userNotified: Boolean(spec.userNotif), at: now, iso: new Date(now).toISOString(),
    };
    const { ref: _r, get: _g, set: _s } = rt();
    const historySnap = await _g(_r(h().dbUsers, `control_moderation/cases/${caseId}/history`));
    const history = historySnap.exists() ? historySnap.val() : [];
    history.push(entry);
    await _s(_r(h().dbUsers, `control_moderation/cases/${caseId}/history`), history);
    // Status fields are merged into the case record (single-node write).
    const { update: _u } = rt();
    await _u(_r(h().dbUsers, `control_moderation/cases/${caseId}`), { status: spec.caseStatus, statusUpdatedAt: now, lastAction: entry });
    // Mark related alerts read for this admin
    const { update: _au2 } = rt();
    await _au2(_r(h().dbUsers, `control_moderation/alerts/${admin.uid}/alert_${admin.uid}_${caseId}`), { read: true });
    // 4) Audit record (immutable)
    await auditModeration(admin, {
        action: `moderation.${action}`, targetType: c.contentType, targetId: c.contentId,
        caseId, reasonId: rendered.id, reasonText: rendered.title,
        internalNote, outcome: { contentChanged: Boolean(spec.contentFlag || spec.deleteContent), accountState: spec.accountState || null },
    });
    // 5) User notification (only if the spec defines one AND an action was taken — never for dismiss)
    if (spec.userNotif) {
        try { await notifyUser({ userId: c.authorId, type: spec.userNotif, lang, reasonText: userFacing, caseId, contentRef: `${c.contentType}:${c.contentId}` }); }
        catch (e) { console.error("user notification failed:", e.message); }
    }
    return { ...c, status: spec.caseStatus, lastAction: entry };
}

async function reverseAction({ admin, caseId, action, reasonId, reasonText, lang = "ar", vars = {} }) {
    const spec = REVERSE_ACTIONS[action];
    if (!spec) throw new Error("UNKNOWN_ACTION");
    if (!core.can(admin.role, spec.perm)) { const e = new Error("FORBIDDEN"); e.status = 403; throw e; }
    if (!checkDuplicate(admin.uid, caseId, action)) throw new Error("DUPLICATE_ACTION");
    const hasTemplate = reasonId && reasonId !== "custom";
    if (!hasTemplate && (!reasonText || String(reasonText).trim().length < 5)) throw new Error("REASON_REQUIRED");
    const rendered = hasTemplate ? await renderReason(reasonId, lang, vars) : { id: "custom", title: String(reasonText).trim(), explanation: String(reasonText).trim() };
    const c = await getCase(caseId);
    if (!c) throw new Error("CASE_NOT_FOUND");
    const now = Date.now();
    const { dbUsers, ref, get, update, set } = h();
    const uref = ref(dbUsers, `user_data/Profile/${c.authorId}`);
    const usnap = await get(uref);
    if (usnap.exists()) {
        await update(uref, { accountState: spec.accountState, accountStateUpdatedAt: new Date(now).toISOString(), accountStateBy: admin.uid });
    }
    const entry = { action, by: admin.uid, byRole: admin.role, reasonId: rendered.id, reasonText: rendered.title, reverses: spec.reverses, at: now, iso: new Date(now).toISOString() };
    const historySnap = await get(ref(dbUsers, `control_moderation/cases/${caseId}/history`));
    const history = historySnap.exists() ? historySnap.val() : [];
    history.push(entry);
    await set(ref(dbUsers, `control_moderation/cases/${caseId}/history`), history);
    const { update: _uu } = rt();
    await _uu(ref(dbUsers, `control_moderation/cases/${caseId}`), { lastAction: entry });
    await auditModeration(admin, { action: `moderation.${action}`, targetType: c.contentType, targetId: c.contentId, caseId, reasonId: rendered.id, reasonText: rendered.title, outcome: { reversal: true, accountState: spec.accountState } });
    if (spec.userNotif) {
        try { await notifyUser({ userId: c.authorId, type: spec.userNotif, lang, reasonText: rendered.explanation || rendered.title, caseId }); }
        catch (e) { console.error("user notification failed:", e.message); }
    }
    return { ...c, lastAction: entry };
}

// ── Appeals ────────────────────────────────────────────────────────────────
async function createAppeal({ userId, caseId, message, lang = "ar" }) {
    const c = await getCase(caseId);
    if (!c || c.authorId !== String(userId)) throw new Error("APPEAL_FORBIDDEN");
    if (c.status !== "actioned") throw new Error("APPEAL_NOT_ALLOWED");
    const { ref, get, set, push } = rt();
    const dupSnap = await get(ref(h().dbUsers, "control_moderation/appeals"));
    const existing = dupSnap.exists() ? (Array.isArray(dupSnap.val()) ? dupSnap.val() : Object.values(dupSnap.val() || {})) : [];
    if (existing.some((a) => a && a.caseId === caseId && a.status === "pending")) throw new Error("APPEAL_DUPLICATE");
    // Stable generated ID (avoid relying on push()'s returned key shape).
    const appealId = "ap_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await set(ref(h().dbUsers, `control_moderation/appeals/${appealId}`), { id: appealId, caseId, userId: String(userId), message: String(message || "").slice(0, 1000), status: "pending", createdAt: Date.now() });
    const { update: _au } = rt();
    await _au(ref(h().dbUsers, `control_moderation/cases/${caseId}`), { appeal: { id: appealId, status: "pending", createdAt: Date.now() } });
    await notifyUser({ userId, type: "appeal.received", lang, caseId });
    return appealId;
}
async function resolveAppeal({ admin, appealId, approve, reasonId, reasonText, lang = "ar" }) {
    const { ref, get, set } = rt();
    const snap = await get(ref(h().dbUsers, `control_moderation/appeals/${appealId}`));
    if (!snap.exists()) throw new Error("APPEAL_NOT_FOUND");
    const appeal = snap.val();
    if (appeal.status !== "pending") throw new Error("APPEAL_ALREADY_RESOLVED");
    if (!reasonId && (!reasonText || String(reasonText).trim().length < 5)) throw new Error("REASON_REQUIRED");
    const rendered = reasonId && reasonId !== "custom" ? await renderReason(reasonId, lang) : { id: "custom", title: String(reasonText).trim(), explanation: String(reasonText).trim() };
    await set(ref(h().dbUsers, `control_moderation/appeals/${appealId}`), { ...appeal, status: approve ? "approved" : "rejected", resolvedBy: admin.uid, resolvedAt: Date.now() });
    const { update: _ru } = rt();
    await _ru(ref(h().dbUsers, `control_moderation/cases/${appeal.caseId}`), { "appeal/status": approve ? "approved" : "rejected" });
    // Approved appeal → undo the enforcement on the linked content (if it still exists).
    if (approve) {
        try {
            const c = await getCase(appeal.caseId);
            if (c) {
                const { dbContent, ref: _cr, get: _cg, update: _cu } = h();
                const cref = _cr(dbContent, c.contentPath);
                const snap = await _cg(cref);
                if (snap.exists()) await _cu(cref, { hidden: false, hiddenByModeration: false });
            }
        } catch (e) { console.error("appeal restore failed:", e.message); }
    }
    await auditModeration(admin, { action: `appeal.${approve ? "approve" : "reject"}`, targetType: "moderation_case", targetId: appeal.caseId, caseId: appeal.caseId, reasonId: rendered.id, reasonText: rendered.title, outcome: { appeal: approve ? "approved" : "rejected" } });
    await notifyUser({ userId: appeal.userId, type: approve ? "appeal.approved" : "appeal.rejected", lang, reasonText: rendered.explanation || rendered.title, caseId: appeal.caseId });
    return { appealId, status: approve ? "approved" : "rejected" };
}
async function listAppeals() {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, "control_moderation/appeals"));
    return snap.exists() ? Object.values(snap.val()) : [];
}

// ── Dashboard overview metrics (computed from real case data only) ─────────
async function overviewStats() {
    const cases = await listCases();
    const total = cases.length;
    const pending = cases.filter((c) => c.status === "pending").length;
    const highPriority = cases.filter((c) => c.status === "pending" && Number(c.severity) >= 4).length;
    const actioned = cases.filter((c) => c.status === "actioned");
    const dismissed = cases.filter((c) => c.status === "dismissed");
    const resolved = actioned.length + dismissed.length;
    const actionsTaken = cases.reduce((n, c) => n + (c.actionsTaken?.length || 0) + (c.lastAction ? 1 : 0), 0);
    const falsePositives = dismissed.filter((c) => (c.history || []).some((hh) => hh.action === "dismiss")).length;
    const reviewedTotal = resolved || 1;
    return { total, pending, highPriority, actionsTaken, resolved, dismissed: dismissed.length, falsePositiveRate: Number((dismissed.length / reviewedTotal).toFixed(3)) };
}

// ── Alerts ────────────────────────────────────────────────────────────────
async function listAlerts(adminUid) {
    const { ref, get } = rt();
    const snap = await get(ref(h().dbUsers, `control_moderation/alerts/${adminUid}`));
    const val = snap.exists() ? snap.val() : {};
    return Object.values(val).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
async function markAlertRead(adminUid, alertId) {
    const { ref, get, update } = rt();
    // update() on the alert node — safer than writing a sub-path leaf.
    const snap = await get(ref(h().dbUsers, `control_moderation/alerts/${adminUid}/${alertId}`));
    const cur = snap.exists() ? snap.val() : { read: false };
    await update(ref(h().dbUsers, `control_moderation/alerts/${adminUid}/${alertId}`), { ...cur, read: true });
}

// ── Hook for content write paths (non-blocking) ───────────────────────────
async function hookContentWrite({ type, id, record, authorId, contentPath }) {
    try {
        return await scanAndFlag({ type, id, record, authorId, originalContentPath: contentPath });
    } catch (e) {
        console.error("moderation hook error:", e.message);
        return null; // never break the user write path
    }
}

module.exports = {
    loadConfig, saveConfig, ensureSeeded,
    listDictionary, upsertDictionaryEntry, setDictionaryEntryEnabled, deleteDictionaryEntry,
    listReasons, renderReason,
    scanAndFlag, hookContentWrite,
    caseView, listCases, getCase, contentPreview,
    REVIEW_ACTIONS, applyReviewAction, reverseAction,
    createAppeal, resolveAppeal, listAppeals,
    notifyUser, USER_NOTIF_TITLES,
    overviewStats, listAlerts, markAlertRead, auditModeration,
};
