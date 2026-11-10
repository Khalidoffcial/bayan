process.env.ADMIN_JWT_SECRET = "s2";
const store = {};
const mkRef = (p) => ({ path: p });
const mockRTDB = {
    ref: (_db, p) => mkRef(p),
    get: async (r) => ({ exists: () => store[r.path] !== undefined, val: () => (store[r.path] !== undefined ? store[r.path] : null) }),
    set: async (r, v) => { if (v === null) delete store[r.path]; else store[r.path] = v; },
    update: async (r, v) => { store[r.path] = { ...(store[r.path] || {}), ...v }; },
    push: (_db, p) => mkRef(p + "/id" + Math.random().toString(36).slice(2, 8)),
    remove: async (r) => { delete store[r.path]; },
    runTransaction: async (r, fn) => fn({ val: () => store[r.path], exists: () => store[r.path] !== undefined }),
    query: (r) => r, orderByChild: () => ({}), equalTo: () => ({}), limitToLast: () => ({}),
};
mockRTDB.get = async (r) => {
    if (store[r.path] !== undefined) return { exists: () => true, val: () => store[r.path] };
    const prefix = r.path + "/"; let any = false; const out = {};
    for (const k of Object.keys(store)) {
        if (k.startsWith(prefix)) { any = true; const parts = k.slice(prefix.length).split("/"); let node = out;
            for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
            node[parts[parts.length - 1]] = store[k]; }
    }
    return { exists: () => any, val: () => (any ? out : null) };
};
const core = require("./admin/core");
core.initAdmin({ rtdb: mockRTDB, dbUsers: { _m: 1 }, dbContent: { _m: 1 }, io: null, redisMode: "m" });
const svc = require("./moderation/service");
const superAdmin = { uid: "adm1", role: "super_admin", perms: core.permissionsFor("super_admin") };
(async () => {
    await svc.ensureSeeded();
    store["posts/postsp99"] = { id: "p99", content: "i will kill you", autherID: "u9" };
    const res = await svc.scanAndFlag({ type: "posts", id: "p99", record: store["posts/postsp99"], authorId: "u9" });
    try {
        const out = await svc.applyReviewAction({ admin: superAdmin, caseId: res.caseId, action: "delete", reasonId: "cnt-del-threat", lang: "ar" });
        console.log("OK out");
    } catch (e) { console.log("ERR:", e.message, e.stack.split("\n").slice(1, 4).join(" | ")); }
    const audits = Object.values(store.control_audit || {});
    console.log("audit actions:", audits.map(a => a.action));
    console.log("notif keys:", Object.keys(store).filter(k => k.includes("moderation_notifs")));
})();
