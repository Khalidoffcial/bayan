/**
 * Bayan — moderation admin API router.
 * Mounted at /admin/api/moderation/* INSIDE the existing admin router, so all
 * requests already pass the real admin auth middleware (`requireAdmin`).
 * Server-side RBAC enforced here via requirePermission / core.can.
 */
"use strict";
const express = require("express");
const core = require("../admin/core");
const svc = require("./service");

const router = express.Router();

const MOD_PERMS = {
    casesView: "content.view",
    dictionary: "content.edit",
    dictionaryDel: "content.delete",
    review: "content.hide",
    hide: "content.hide",
    del: "content.delete",
    restore: "content.restore",
    warn: "users.restrict",
    suspend: "users.suspend",
    ban: "users.ban",
    reasonsManage: "content.edit",
    appeals: "content.view",
};

// ── Config ──
router.get("/config", async (_req, res) => {
    try { res.json({ status: "ok", config: await svc.loadConfig() }); }
    catch (e) { res.status(500).json({ status: "error", message: "CONFIG_FAILED" }); }
});
router.put("/config", async (req, res) => {
    try {
        if (!core.can(req.admin.role, "system.settings")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        res.json({ status: "ok", config: await svc.saveConfig(req.body || {}) });
    } catch (e) { res.status(500).json({ status: "error", message: "CONFIG_FAILED" }); }
});

// ── Overview ──
router.get("/overview", async (req, res) => {
    try {
        const stats = await svc.overviewStats();
        res.json({ status: "ok", stats });
    } catch (e) { console.error("moderation overview error:", e.message); res.status(500).json({ status: "error", message: "OVERVIEW_FAILED" }); }
});

// ── Cases ──
router.get("/cases", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.casesView)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const rows = await svc.listCases(req.query);
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 20));
        const items = rows.slice((page - 1) * pageSize, page * pageSize)
            .map((c) => svc.caseView(c, { includeEvidence: false }));
        res.json({ status: "ok", page, pageSize, total: rows.length, totalPages: Math.ceil(rows.length / pageSize) || 1, items });
    } catch (e) { console.error("moderation cases error:", e.message); res.status(500).json({ status: "error", message: "CASES_FAILED" }); }
});
router.get("/cases/:id", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.casesView)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const c = await svc.getCase(req.params.id);
        if (!c) return res.status(404).json({ status: "error", message: "CASE_NOT_FOUND" });
        const preview = await svc.contentPreview(c.contentType, c.contentId);
        res.json({ status: "ok", case: svc.caseView(c), contentPreview: preview });
    } catch (e) { res.status(500).json({ status: "error", message: "CASE_FAILED" }); }
});
router.post("/cases/:id/actions", async (req, res) => {
    try {
        const { action, reasonId, reason, internalNote, lang } = req.body || {};
        // per-action permission check happens inside applyReviewAction
        const updated = await svc.applyReviewAction({
            admin: req.admin, caseId: req.params.id, action,
            reasonId, reasonText: reason, internalNote, lang: lang || "ar",
            vars: { contentId: req.params.id },
        });
        res.json({ status: "ok", case: svc.caseView(updated, { includeEvidence: false }) });
    } catch (e) {
        const map = { FORBIDDEN: 403, REASON_REQUIRED: 400, DUPLICATE_ACTION: 409, UNKNOWN_ACTION: 400, CASE_NOT_FOUND: 404, REASON_DISABLED: 400, REASON_NOT_FOUND: 400 };
        res.status(map[e.message] || 500).json({ status: "error", message: e.message });
    }
});
router.post("/cases/:id/reverse", async (req, res) => {
    try {
        const { action, reasonId, reason, lang } = req.body || {};
        const updated = await svc.reverseAction({ admin: req.admin, caseId: req.params.id, action, reasonId, reasonText: reason, lang: lang || "ar" });
        res.json({ status: "ok", case: svc.caseView(updated, { includeEvidence: false }) });
    } catch (e) {
        const map = { FORBIDDEN: 403, REASON_REQUIRED: 400, DUPLICATE_ACTION: 409, UNKNOWN_ACTION: 400, CASE_NOT_FOUND: 404 };
        res.status(map[e.message] || 500).json({ status: "error", message: e.message });
    }
});

// ── Dictionary ──
router.get("/dictionary", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.dictionary)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        res.json({ status: "ok", items: await svc.listDictionary() });
    } catch (e) { res.status(500).json({ status: "error", message: "DICT_FAILED" }); }
});
router.post("/dictionary", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.dictionary)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const id = await svc.upsertDictionaryEntry(req.admin, req.body || {});
        res.json({ status: "ok", id });
    } catch (e) {
        const map = { TERM_REQUIRED: 400, ENTRY_NOT_FOUND: 404 };
        res.status(map[e.message] || 500).json({ status: "error", message: e.message });
    }
});
router.patch("/dictionary/:id", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.dictionary)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const body = req.body || {};
        if (body.enabled !== undefined) {
            await svc.setDictionaryEntryEnabled(req.admin, req.params.id, body.enabled);
            return res.json({ status: "ok" });
        }
        const id = await svc.upsertDictionaryEntry(req.admin, { ...body, id: req.params.id });
        res.json({ status: "ok", id });
    } catch (e) { res.status(404).json({ status: "error", message: e.message }); }
});
router.delete("/dictionary/:id", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.dictionaryDel)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        await svc.deleteDictionaryEntry(req.params.id);
        await core.writeAudit({ adminUid: req.admin.uid, adminRole: req.admin.role, action: "moderation.dict_delete", targetType: "dictionary_entry", targetId: req.params.id, reason: String(req.body?.reason || "").slice(0, 500) || null, ip: req.ip });
        res.json({ status: "ok" });
    } catch (e) { res.status(500).json({ status: "error", message: "DICT_DELETE_FAILED" }); }
});

// ── Reason Library ──
router.get("/reasons", async (req, res) => {
    try {
        const items = await svc.listReasons();
        const op = String(req.query.op || "");
        const filtered = op ? items.filter((r) => r.op === op && r.enabled !== false) : items;
        res.json({ status: "ok", items: filtered });
    } catch (e) { res.status(500).json({ status: "error", message: "REASONS_FAILED" }); }
});
router.get("/reasons/:id/render", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.casesView)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const lang = String(req.query.lang || "ar");
        res.json({ status: "ok", rendered: await svc.renderReason(req.params.id, lang, req.query) });
    } catch (e) { res.status(404).json({ status: "error", message: e.message }); }
});
router.post("/reasons", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.reasonsManage)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const b = req.body || {};
        if (!b.id || !b.op || !b.title) return res.status(400).json({ status: "error", message: "INVALID_INPUT" });
        const { ref, get, set } = svc.__rtForTests ? svc.__rtForTests() : require("../admin/core").rtdbFns();
        const key = String(b.id).slice(0, 60).replace(/[.#$/\[\]]/g, "_");
        await set(ref(require("../admin/core").handles().dbUsers, `control_moderation/reasons/${key}`), {
            id: key, op: String(b.op).slice(0, 40), category: b.category || null, enabled: b.enabled !== false,
            title: b.title, explanation: b.explanation || {}, createdBy: req.admin.uid, createdAt: Date.now(), updatedAt: Date.now(),
        });
        res.json({ status: "ok", id: key });
    } catch (e) { res.status(500).json({ status: "error", message: "REASON_CREATE_FAILED" }); }
});
router.patch("/reasons/:id", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.reasonsManage)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const { ref, update } = require("../admin/core").rtdbFns();
        await update(ref(require("../admin/core").handles().dbUsers, `control_moderation/reasons/${req.params.id}`), {
            ...(req.body.enabled !== undefined ? { enabled: Boolean(req.body.enabled) } : {}),
            ...(req.body.title ? { title: req.body.title } : {}),
            ...(req.body.explanation ? { explanation: req.body.explanation } : {}),
            updatedBy: req.admin.uid, updatedAt: Date.now(),
        });
        res.json({ status: "ok" });
    } catch (e) { res.status(500).json({ status: "error", message: "REASON_UPDATE_FAILED" }); }
});

// ── Alerts ──
router.get("/alerts", async (req, res) => {
    try {
        const alerts = await svc.listAlerts(req.admin.uid);
        const unread = alerts.filter((a) => !a.read).length;
        res.json({ status: "ok", unread, items: alerts.slice(0, 50) });
    } catch (e) { res.status(500).json({ status: "error", message: "ALERTS_FAILED" }); }
});
router.post("/alerts/:id/read", async (req, res) => {
    try { await svc.markAlertRead(req.admin.uid, req.params.id); res.json({ status: "ok" }); }
    catch (e) { res.status(500).json({ status: "error", message: "ALERT_FAILED" }); }
});

// ── Appeals ──
router.get("/appeals", async (req, res) => {
    try {
        if (!core.can(req.admin.role, MOD_PERMS.appeals)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        res.json({ status: "ok", items: await svc.listAppeals() });
    } catch (e) { res.status(500).json({ status: "error", message: "APPEALS_FAILED" }); }
});
router.post("/appeals/:id/resolve", async (req, res) => {
    try {
        if (!core.can(req.admin.role, "users.suspend") && !core.can(req.admin.role, "content.restore")) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        const { approve, reasonId, reason, lang } = req.body || {};
        const out = await svc.resolveAppeal({ admin: req.admin, appealId: req.params.id, approve: Boolean(approve), reasonId, reasonText: reason, lang: lang || "ar" });
        res.json({ status: "ok", ...out });
    } catch (e) {
        const map = { FORBIDDEN: 403, REASON_REQUIRED: 400, APPEAL_NOT_FOUND: 404, APPEAL_ALREADY_RESOLVED: 409, REASON_NOT_FOUND: 400 };
        res.status(map[e.message] || 500).json({ status: "error", message: e.message });
    }
});

module.exports = router;
