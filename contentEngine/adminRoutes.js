/**
 * contentEngine/adminRoutes.js — Control Center integration.
 *
 * Mounted INSIDE the existing admin router (admin/index.js) under
 * /admin/api/content-engine/* — reuses its auth.requireAdmin middleware and
 * RBAC permissions (core.MATRIX). Mutating actions require db.write /
 * system.settings / content.edit depending on the action; everything writes
 * a control_audit record BEFORE responding (audit-first, fail-closed),
 * exactly like the rest of the Control Center.
 */

const engine = require("./engine");
const queue = require("./queue");
const config = require("./config");
const personas = require("./personas");
const categories = require("./categories");

function registerAdminRoutes({ router, core, auth }) {
    const _rt = () => core.rtdbFns();
    const ref = (...a) => _rt().ref(...a), get = (...a) => _rt().get(...a),
        set = (...a) => _rt().set(...a), update = (...a) => _rt().update(...a);
    const H = () => core.handles();

    /** audit-first helper (mirrors admin/index.js pattern) */
    async function audit(admin, action, target, details = {}, success = true) {
        const crypto = require("crypto");
        try {
            const rec = {
                at: Date.now(), adminUid: admin.uid, action, target,
                ipHash: crypto.createHash("sha256").update(String(admin.ip || "")).digest("hex").slice(0, 16),
                success, details: core.deepSanitize ? core.deepSanitize(details) : details,
            };
            await set(ref(H().dbUsers, `control_audit/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), rec);
        } catch (e) { console.error("content-engine audit failed:", e.message); }
    }

    const perm = (p) => (req, res, next) => {
        if (!req.admin?.perms?.includes(p)) return res.status(403).json({ status: "error", message: "FORBIDDEN" });
        next();
    };

    // ── Health & overview (any admin with servers.view or content.view) ──
    router.get("/content-engine/health", auth.requireAdmin, perm("content.view"), async (req, res) => {
        try {
            const model = await require("./generator").modelStatus();
            const jobs = await queue.listJobs({ limit: 200 });
            const counts = {};
            for (const s of queue.STATES) counts[s] = jobs.filter((j) => j.state === s).length;
            const published = await get(ref(H().dbUsers, "content_engine/published"));
            const publishedItems = published.exists() ? Object.values(published.val()) : [];
            const published24h = publishedItems.filter((r) => Number(r.publishedAt || 0) >= Date.now() - 86400000).length;
            res.json({
                status: "ok", engine: engine.health(), model,
                queueCounts: counts,
                published: { total: publishedItems.length, last24h: published24h, limit: config.limits.maxTotalPerDay },
                coverage: {
                    categories: categories.allVerticals().map((v) => ({
                        key: v.key, label: v.label, area: v.area,
                        published: publishedItems.filter((r) => r.vertical === v.key).length,
                    })),
                    languages: config.languages,
                },
                personas: personas.listPersonas(),
            });
        } catch (e) { res.status(500).json({ status: "error", message: e.message }); }
    });

    // ── Queue inspection ──
    router.get("/content-engine/queue", auth.requireAdmin, perm("content.view"), async (req, res) => {
        try {
            const state = req.query.state || undefined;
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
            res.json({ status: "ok", items: await queue.listJobs({ state, limit }) });
        } catch (e) { res.status(500).json({ status: "error", message: e.message }); }
    });

    // ── Approve / Reject / Retry / Delete / Archive (content.edit) ──
    router.post("/content-engine/jobs/:id/actions", auth.requireAdmin, perm("content.edit"), async (req, res) => {
        try {
            const { action, reason } = req.body || {};
            const auditNote = { action, reason, jobId: req.params.id };
            if (action === "approve") {
                await audit(req.admin, "content_engine.job.approve", req.params.id, auditNote);
                const result = await engine.approveAndPublish(req.params.id, { approvedBy: req.admin.uid });
                return res.json({ status: "ok", result });
            }
            if (action === "reject") {
                await audit(req.admin, "content_engine.job.reject", req.params.id, auditNote);
                await engine.rejectJob(req.params.id, { rejectedBy: req.admin.uid, reason });
                return res.json({ status: "ok" });
            }
            if (action === "retry") {
                await audit(req.admin, "content_engine.job.retry", req.params.id, auditNote);
                await engine.retryJob(req.params.id);
                return res.json({ status: "ok" });
            }
            if (action === "archive") {
                await audit(req.admin, "content_engine.job.archive", req.params.id, auditNote);
                await queue.setState(req.params.id, "ARCHIVED", { note: `archived by ${req.admin.uid}` });
                return res.json({ status: "ok" });
            }
            if (action === "delete") {
                await audit(req.admin, "content_engine.job.delete", req.params.id, auditNote);
                await queue.deleteJob(req.params.id);
                return res.json({ status: "ok" });
            }
            return res.status(400).json({ status: "error", message: "unknown action" });
        } catch (e) {
            await audit(req.admin, `content_engine.${req.body?.action || "unknown"}`, req.params.id, { error: e.message }, false);
            res.status(400).json({ status: "error", message: e.message });
        }
    });

    // ── Edit before publish (content.edit) ──
    router.put("/content-engine/jobs/:id", auth.requireAdmin, perm("content.edit"), async (req, res) => {
        try {
            const { title, descrip, content } = req.body || {};
            const patch = {};
            if (title !== undefined) patch["draft.title"] = String(title);
            if (descrip !== undefined) patch["draft.descrip"] = String(descrip);
            if (content !== undefined) patch["draft.content"] = String(content);
            await update(ref(H().dbUsers, `content_engine/queue/${req.params.id}`), patch);
            await audit(req.admin, "content_engine.job.edit", req.params.id, { fields: Object.keys(patch) });
            res.json({ status: "ok" });
        } catch (e) { res.status(400).json({ status: "error", message: e.message }); }
    });

    // ── Settings: pause/resume, limits, autoPublish, approval mode (system.settings) ──
    router.put("/content-engine/settings", auth.requireAdmin, perm("system.settings"), async (req, res) => {
        try {
            const allowed = ["enabled", "approvalRequired", "autoPublish", "maxArticlesPerDay", "maxPostsPerDay", "maxNovelsPerDay", "maxTotalPerDay"];
            const patch = {};
            for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
            await update(ref(H().dbUsers, "content_engine/settings"), { ...patch, updatedAt: Date.now(), updatedBy: req.admin.uid });
            // apply runtime
            if (patch.enabled !== undefined) config.enabled = Boolean(patch.enabled);
            if (patch.approvalRequired !== undefined) config.approvalRequired = Boolean(patch.approvalRequired);
            if (patch.autoPublish !== undefined) config.autoPublish = Boolean(patch.autoPublish);
            for (const k of ["maxArticlesPerDay", "maxPostsPerDay", "maxNovelsPerDay", "maxTotalPerDay"]) {
                if (patch[k] !== undefined) config.limits[k] = Number(patch[k]);
            }
            await audit(req.admin, "content_engine.settings.update", "content_engine/settings", patch);
            res.json({ status: "ok", settings: { enabled: config.enabled, approvalRequired: config.approvalRequired, autoPublish: config.autoPublish, limits: config.limits } });
        } catch (e) { res.status(400).json({ status: "error", message: e.message }); }
    });

    // ── Published content management (content.view / content.delete) ──
    router.get("/content-engine/published", auth.requireAdmin, perm("content.view"), async (req, res) => {
        try {
            const snap = await get(ref(H().dbUsers, "content_engine/published"));
            const items = snap.exists() ? Object.values(snap.val()).sort((a, b) => b.publishedAt - a.publishedAt) : [];
            res.json({ status: "ok", items: items.slice(0, Number(req.query.limit) || 50) });
        } catch (e) { res.status(500).json({ status: "error", message: e.message }); }
    });

    router.post("/content-engine/published/:id/rollback", auth.requireAdmin, perm("content.delete"), async (req, res) => {
        try {
            const snap = await get(ref(H().dbUsers, `content_engine/published/${req.params.id}`));
            if (!snap.exists()) return res.status(404).json({ status: "error", message: "not found" });
            const rec = snap.val();
            const { remove, ref: refContent, get: getContent, set: setContent } = require("../datastore/firebaseArticle");
            const path = `${rec.type}/${rec.type}${rec.contentId}`;
            const snapC = await getContent(refContent(path));
            if (snapC.exists()) {
                // archival copy for recovery, then removal — safe rollback
                await setContent(ref(H().dbUsers, `content_engine/rolled_back/${rec.contentId}`), snapC.val());
                await remove(refContent(path));
                // remove id from the category index
                for (const cat of Object.keys(snapC.val().category || {})) {
                    const catSnap = await getContent(refContent(`categories/${rec.type}/${cat}`));
                    if (catSnap.exists() && Array.isArray(catSnap.val())) {
                        await setContent(refContent(`categories/${rec.type}/${cat}`), catSnap.val().filter((x) => x !== String(rec.contentId)));
                    }
                }
            }
            await update(ref(H().dbUsers, `content_engine/published/${req.params.id}`), { rolledBack: true, rolledBackAt: Date.now(), rolledBackBy: req.admin.uid });
            await audit(req.admin, "content_engine.rollback", rec.contentId, { type: rec.type });
            res.json({ status: "ok", rolledBack: true });
        } catch (e) { res.status(400).json({ status: "error", message: e.message }); }
    });
}

module.exports = { registerAdminRoutes };
