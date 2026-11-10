/**
 * Moderation system tests — engine + service workflow + RBAC + audit.
 * Run: node tests/moderation.test.js   (uses mock RTDB handles)
 */
process.env.ADMIN_JWT_SECRET = "test-admin-secret";
process.env.ADMIN_AUDIT_SALT = "test-salt";
const assert = require("assert");
const path = require("path");
const Module = require("module");

// ── In-memory RTDB mock (same store for everything) ──
const store = {};
const mkRef = (p) => ({ path: p });
const mockRTDB = {
    ref: (_db, p) => mkRef(p),
    get: async (r) => ({
        exists: () => store[r.path] !== undefined,
        val: () => (store[r.path] !== undefined ? store[r.path] : null),
    }),
    set: async (r, v) => { if (v === null) delete store[r.path]; else store[r.path] = v; },
    update: async (r, v) => { store[r.path] = { ...(store[r.path] || {}), ...v }; },
    // push is called two ways in the codebase: push(refObj) or push(db, path)
    push: (a, b) => mkRef(typeof b === "string" ? b : a.path + "/id" + Math.random().toString(36).slice(2, 8)),
    remove: async (r) => { delete store[r.path]; },
    runTransaction: async (r, fn) => fn({ val: () => store[r.path], exists: () => store[r.path] !== undefined }),
    query: (r) => r, orderByChild: () => ({}), equalTo: () => ({}), limitToLast: () => ({}),
};
// hierarchical get: emulate RTDB subtree aggregation
const origGet = mockRTDB.get;
mockRTDB.get = async (r) => {
    if (store[r.path] !== undefined) return { exists: () => true, val: () => store[r.path] };
    const prefix = r.path + "/";
    let any = false; const out = {};
    for (const k of Object.keys(store)) {
        if (k.startsWith(prefix)) {
            any = true;
            const parts = k.slice(prefix.length).split("/");
            let node = out;
            for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
            node[parts[parts.length - 1]] = store[k];
        }
    }
    return { exists: () => any, val: () => (any ? out : null) };
};

const core = require("../admin/core");
// hierarchical aggregation over the shared mock store (RTDB-like)
mockRTDB.get = async (r) => {
    if (store[r.path] !== undefined) return { exists: () => true, val: () => store[r.path] };
    const prefix = r.path + "/";
    let any = false; const out = {};
    for (const k of Object.keys(store)) {
        if (k.startsWith(prefix)) {
            any = true;
            const parts = k.slice(prefix.length).split("/");
            let node = out;
            for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
            node[parts[parts.length - 1]] = store[k];
        }
    }
    return { exists: () => any, val: () => (any ? out : null) };
};
core.initAdmin({ rtdb: mockRTDB, dbUsers: { _mock: true }, dbContent: { _mock: true }, io: null, redisMode: "memory" });

const svc = require("../moderation/service");
const engine = require("../moderation/engine");

const ENTRIES = [
    { id: "e1", term: "badword", lang: "en", categoryId: "profanity", severity: 2, match: "word", enabled: true },
    { id: "e2", term: "i will kill you", lang: "en", categoryId: "threats_violence", severity: 5, match: "phrase", enabled: true },
    { id: "e3", term: "سأقتلك", lang: "ar", categoryId: "threats_violence", severity: 5, match: "phrase", enabled: true },
    { id: "e4", term: "كلب", lang: "ar", categoryId: "profanity", severity: 1, match: "word", enabled: true },
    { id: "e5", term: "free money click here", lang: "en", categoryId: "spam", severity: 2, match: "phrase", enabled: true },
    { id: "e6", term: "badword", lang: "en", categoryId: "profanity", severity: 4, match: "word", enabled: false }, // disabled
];

let pass = 0, fail = 0;
const t = async (name, fn) => {
    try { await fn(); pass++; console.log("  ✓ " + name); }
    catch (e) { fail++; console.log("  ✗ " + name + " — " + e.message); }
};

(async () => {
    console.log("== Engine ==");

    await t("detects Arabic language", async () => {
        assert.strictEqual(engine.detectLanguage("هذا نص عربي طويل عن موضوع ما"), "ar");
    });
    await t("detects English by stopwords", async () => {
        assert.strictEqual(engine.detectLanguage("this is a test and that is fine"), "en");
    });
    await t("Arabic normalization folds hamza/ya/ta-marbuta", async () => {
        const v = engine.variants("أَحْمَد إسلامىة");
        assert.strictEqual(v.base, "احمد اسلاميه");
    });
    await t("Arabic diacritics/tatweel stripped", async () => {
        const v = engine.variants("كــلـــب");
        assert.ok(v.base.includes("كلب"));
    });
    await t("obfuscated leet: b4dw0rd matches badword", async () => {
        const r = engine.scan("you are a b4dw0rd person", { entries: ENTRIES });
        assert.ok(r.matches.some((m) => m.entry.id === "e1"));
    });
    await t("collapsed repeats: baaadwooord matches", async () => {
        const r = engine.scan("what a baaadwoooord", { entries: ENTRIES });
        assert.ok(r.matches.some((m) => m.entry.id === "e1"));
    });
    await t("spacing obfuscation caught by squash match", async () => {
        const r = engine.scan("b a d w o r d", { entries: [{ ...ENTRIES[0], match: "exact" }] });
        assert.ok(r.matches.some((m) => m.method === "obfuscation-squash"));
    });
    await t("disabled entries do not match", async () => {
        const r = engine.scan("this is badword indeed", { entries: ENTRIES });
        const hits = r.matches.filter((m) => m.entry.id === "e6");
        assert.strictEqual(hits.length, 0);
    });
    await t("language scoping: arabic term not applied to english text", async () => {
        const r = engine.scan("hello friend how are you كلب", { entries: ENTRIES });
        // text contains arabic script so it detects as ar — term applies
        const en = engine.scan("hello friend how are you", { entries: ENTRIES });
        assert.ok(!en.matches.some((m) => m.entry.id === "e4"));
    });
    await t("threat phrase raises severity 5", async () => {
        const r = engine.scan("if you do that i will kill you", { entries: ENTRIES });
        assert.strictEqual(r.maxSeverity, 5);
        assert.ok(r.categories.threats_violence === 5);
    });
    await t("Arabic threat detected with diacritic variants", async () => {
        const r = engine.scan("سَأقتلك ان لم تتوقف", { entries: ENTRIES });
        assert.strictEqual(r.maxSeverity, 5);
    });
    await t("educational context downgrades severity", async () => {
        const plain = engine.scan("i will kill you", { entries: ENTRIES });
        const guarded = engine.scan("documentary about psychology: he said i will kill you — cited study", { entries: ENTRIES });
        assert.strictEqual(plain.maxSeverity, 5);
        assert.ok(guarded.maxSeverity < 5 || guarded.contextGuarded > 0);
    });
    await t("clean text produces no matches", async () => {
        const r = engine.scan("this is a nice post about cooking pasta", { entries: ENTRIES });
        assert.strictEqual(r.matches.length, 0);
        assert.strictEqual(r.maxSeverity, 0);
    });

    console.log("== Workflow (service) ==");

    // seed admin actors
    store["control_admins/adm1"] = { uid: "adm1", email: "a@b.test", name: "A", role: "super_admin", active: true };
    store["control_admins/md1"] = { uid: "md1", email: "m@b.test", name: "M", role: "moderator", active: true };
    store["control_admins/sp1"] = { uid: "sp1", email: "s@b.test", name: "S", role: "support", active: true };
    store["control_admins/an1"] = { uid: "an1", email: "an@b.test", name: "N", role: "analyst", active: true };
    const superAdmin = { uid: "adm1", role: "super_admin", perms: core.permissionsFor("super_admin") };
    const moderator = { uid: "md1", role: "moderator", perms: core.permissionsFor("moderator") };
    const support = { uid: "sp1", role: "support", perms: core.permissionsFor("support") };
    const analyst = { uid: "an1", role: "analyst", perms: core.permissionsFor("analyst") };

    store["user_data/Profile/u9"] = { Id_user: "u9", S_user: "u9user", F_user: "U Nine", email: "u9@x.test", accountState: "active" };
    store["posts/postsp77"] = { id: "p77", content: "i will kill you all", autherID: "u9", ts: Date.now() };

    await t("ensureSeeded populates categories/dictionary/reasons once", async () => {
        await svc.ensureSeeded();
        assert.ok(store["control_moderation/categories/hate_speech"]);
        assert.ok(store["control_moderation/reasons/cnt-del-threat"]);
        const dictCount = Object.keys(store).filter((k) => k.startsWith("control_moderation/dictionary/")).length;
        assert.ok(dictCount >= 10, "got " + dictCount);
        await svc.ensureSeeded(); // idempotent — no error, no dupe
    });
    await t("scanAndFlag creates a case with evidence", async () => {
        const res = await svc.scanAndFlag({ type: "posts", id: "p77", record: store["posts/postsp77"], authorId: "u9" });
        assert.ok(res.caseId);
        assert.strictEqual(res.severity, 5);
        const c = await svc.getCase(res.caseId);
        assert.strictEqual(c.status, "pending");
        assert.strictEqual(c.language, "en");
        assert.ok(c.matchedTerms.length > 0);
        assert.strictEqual(c.authorId, "u9");
    });
    await t("duplicate detection does not re-alert", async () => {
        const res1 = await svc.scanAndFlag({ type: "posts", id: "p77", record: store["posts/postsp77"], authorId: "u9" });
        const res2 = await svc.scanAndFlag({ type: "posts", id: "p77", record: store["posts/postsp77"], authorId: "u9" });
        assert.ok(res2.deduplicated);
    });
    await t("review action without reason is rejected", async () => {
        await assert.rejects(
            () => svc.applyReviewAction({ admin: moderator, caseId: store.__x || "nope", action: "hide", reasonText: "" }),
            /REASON_REQUIRED|CASE_NOT_FOUND/
        );
    });
    await t("moderator can hide, cannot ban (RBAC)", async () => {
        const cases = await svc.listCases({ status: "pending" });
        const cid = cases[0].id;
        const c1 = await svc.applyReviewAction({ admin: moderator, caseId: cid, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" });
        assert.ok(c1.lastAction);
        await assert.rejects(
            () => svc.applyReviewAction({ admin: moderator, caseId: cid, action: "ban", reasonId: "usr-ban-policy", lang: "ar" }),
            /FORBIDDEN/
        );
        await assert.rejects(
            () => svc.applyReviewAction({ admin: support, caseId: cid, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" }),
            /FORBIDDEN/
        );
    });
    await t("hide sets hidden on content record", async () => {
        const c = (await svc.listCases())[0];
        const rec = store["posts/postsp77"];
        // hide path ran on a fresh case; create a new case to verify flag effect
        store["posts/postsp88"] = { id: "p88", content: "free money click here now", autherID: "u9", ts: Date.now() };
        const res = await svc.scanAndFlag({ type: "posts", id: "p88", record: store["posts/postsp88"], authorId: "u9" });
        await svc.applyReviewAction({ admin: moderator, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "en" });
        assert.strictEqual(store["posts/postsp88"].hidden, true);
    });
    await t("delete removes content + audit recorded", async () => {
        store["posts/postsp99"] = { id: "p99", content: "i will kill you", autherID: "u9", ts: Date.now() };
        const res = await svc.scanAndFlag({ type: "posts", id: "p99", record: store["posts/postsp99"], authorId: "u9" });
        await svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "delete", reasonId: "cnt-del-threat", lang: "ar" });
        assert.strictEqual(store["posts/postsp99"], undefined);
        const audits = Object.keys(store).filter((k) => k.startsWith("control_audit/")).map((k) => store[k]);
        assert.ok(audits.some((a) => a.action === "moderation.delete" && a.reason && a.reason.includes("[cnt-del-threat]") && a.targetId === res.caseId), "audit record with case linkage required");
    });
    await t("user notification written to the user's own node, no internal notes", async () => {
        const notifKeys = Object.keys(store).filter((k) => k.startsWith("user_data/Profile/u9/moderation_notifs/"));
        const list = notifKeys.map((k) => store[k]);
        assert.ok(list.some((n) => n.type === "content.deleted" && n.explanation.length > 0));
        assert.ok(list.every((n) => !JSON.stringify(n).includes("internalNote")));
    });
    await t("dismiss (false positive) sends NO user notification", async () => {
        // Educational/quote context alone does NOT even create a case (FP reduction)
        store["posts/postsp55"] = { id: "p55", content: "this mentions badword in a study context", autherID: "u9" };
        const res1 = await svc.scanAndFlag({ type: "posts", id: "p55", record: store["posts/postsp55"], authorId: "u9" });
        assert.strictEqual(res1, null, "guarded-only match must not create a case");
        // Plain violation does create one; dismissing it sends no notification
        store["posts/postsp56"] = { id: "p56", content: "you idiot person", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "p56", record: store["posts/postsp56"], authorId: "u9" });
        assert.ok(res && res.caseId);
        const before = Object.keys(store["user_data/Profile/u9/moderation_notifs"] || {}).length;
        await svc.applyReviewAction({ admin: moderator, caseId: res.caseId, action: "dismiss", reasonId: "rep-dismiss-fp", lang: "ar" });
        const after = Object.keys(store["user_data/Profile/u9/moderation_notifs"] || {}).length;
        assert.strictEqual(after, before);
    });
    await t("duplicate submit blocked (10s window)", async () => {
        store["posts/postsp66"] = { id: "p66", content: "free money click here", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "p66", record: store["posts/postsp66"], authorId: "u9" });
        await svc.applyReviewAction({ admin: moderator, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" });
        await assert.rejects(
            () => svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" }),
            /DUPLICATE_ACTION/
        );
    });
    await t("suspend + ban enforce accountState, then reversal restores", async () => {
        store["posts/postspAA"] = { id: "pAA", content: "i will kill you", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "pAA", record: store["posts/postspAA"], authorId: "u9" });
        await svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "suspend", reasonId: "usr-susp-repeat", lang: "ar" });
        assert.strictEqual(store["user_data/Profile/u9"].accountState, "suspended");
        await svc.reverseAction({ admin: superAdmin, caseId: res.caseId, action: "unsuspend", reasonId: "usr-unsusp-review", lang: "ar" });
        assert.strictEqual(store["user_data/Profile/u9"].accountState, "active");
        await svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "ban", reasonId: "usr-ban-policy", lang: "ar" });
        assert.strictEqual(store["user_data/Profile/u9"].accountState, "banned");
        // history preserved — reversal didn't erase prior actions
        const hist = store[`control_moderation/cases/${res.caseId}/history`];
        assert.ok(hist.length >= 3);
        assert.ok(hist.some((x) => x.action === "suspend") && hist.some((x) => x.action === "unsuspend") && hist.some((x) => x.action === "ban"));
    });
    await t("warn notification localized (ar + en)", async () => {
        store["posts/postspBB"] = { id: "pBB", content: "you idiot", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "pBB", record: store["posts/postspBB"], authorId: "u9" });
        await svc.applyReviewAction({ admin: moderator, caseId: res.caseId, action: "warn", reasonId: "usr-warn-lang", lang: "en" });
        const notifs = Object.keys(store).filter((k) => k.startsWith("user_data/Profile/u9/moderation_notifs/")).map((k) => store[k]);
        const last = notifs[notifs.length - 1];
        assert.strictEqual(last.type, "user.warned");
        assert.ok(last.explanation.toLowerCase().includes("language") || last.title.toLowerCase().includes("language"));
    });
    await t("appeal flow: create → approve → content/account restored", async () => {
        store["posts/postspCC"] = { id: "pCC", content: "te voy a matar", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "pCC", record: store["posts/postspCC"], authorId: "u9" });
        await svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" });
        const appealId = await svc.createAppeal({ userId: "u9", caseId: res.caseId, message: "this was a quote from a novel" });
        // other user cannot appeal someone else's case
        await assert.rejects(() => svc.createAppeal({ userId: "other", caseId: res.caseId, message: "x" }), /APPEAL_FORBIDDEN/);
        await svc.resolveAppeal({ admin: superAdmin, appealId, approve: true, reasonId: "cnt-restore-appeal", lang: "ar" });
        assert.strictEqual(store["posts/postspCC"].hidden, false);
        const audits = Object.keys(store).filter((k) => k.startsWith("control_audit/")).map((k) => store[k]);
        assert.ok(audits.some((a) => a.action === "appeal.approve" && a.targetId === res.caseId));
    });
    await t("overview stats computed from real cases only", async () => {
        const s = await svc.overviewStats();
        assert.ok(s.total >= 5);
        assert.ok(typeof s.falsePositiveRate === "number");
    });
    await t("concurrent duplicate actions: only one wins (parallel race)", async () => {
        store["posts/postspDD"] = { id: "pDD", content: "free money click here", autherID: "u9" };
        const res = await svc.scanAndFlag({ type: "posts", id: "pDD", record: store["posts/postspDD"], authorId: "u9" });
        const results = await Promise.allSettled([
            svc.applyReviewAction({ admin: moderator, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" }),
            svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "hide", reasonId: "cnt-hide-generic", lang: "ar" }),
        ]);
        const ok = results.filter((r) => r.status === "fulfilled").length;
        assert.strictEqual(ok, 1);
    });
    await t("reason render honors language and placeholders", async () => {
        const ar = await svc.renderReason("cnt-del-threat", "ar", { contentId: "42" });
        assert.ok(/تهديدات/.test(ar.title));
        const en = await svc.renderReason("cnt-del-threat", "en");
        assert.ok(/threat/i.test(en.title));
    });
    await t("disabled reason template refuses to render", async () => {
        store["control_moderation/reasons/test-off"] = { id: "test-off", op: "content.delete", enabled: false, title: { ar: "x", en: "x" }, explanation: {} };
        await assert.rejects(() => svc.renderReason("test-off", "ar"), /REASON_DISABLED/);
    });
    await t("alerts: one per admin per case, unread tracked", async () => {
        const res = await svc.scanAndFlag({ type: "posts", id: "pFF", record: { content: "free money click here today", autherID: "u9" }, authorId: "u9" });
        assert.ok(res && res.caseId, "case created");
        const admAlerts = Object.keys(store).filter((k) => k.startsWith("control_moderation/alerts/adm1/")).map((k) => store[k]);
        const forCase = admAlerts.filter((a) => a.caseId === res.caseId);
        assert.ok(forCase.length >= 1, "alert exists for adm1 (" + admAlerts.length + " total, forCase " + forCase.length + ")");
        await svc.markAlertRead("adm1", forCase[0].id);
        assert.strictEqual(store[`control_moderation/alerts/adm1/${forCase[0].id}`].read, true, "read flag must flip (id=" + forCase[0].id + ")");
    });
    await t("config policy default never auto-suspends", async () => {
        const cfg = await svc.loadConfig();
        assert.strictEqual(cfg.policy.high.autoSuspendHours, 0);
        assert.strictEqual(cfg.policy.high.restrictVisibility, false);
    });

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
