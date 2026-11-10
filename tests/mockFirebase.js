/** Mock replacing datastore/firebase.js AND datastore/firebaseArticle.js.
 *  Shared in-memory store, seeded for e2e admin tests. */
const store = {
    "user_data/Profile/u1": { Id_user: "u1", F_user: "User One", S_user: "user1", email: "u1@bayan.test", Bio: "hi", followers: 2, following: 1, Posters: "", settings: {}, createdTs: Date.now() - 86400000 },
    "user_data/Profile/u2": { Id_user: "u2", F_user: "User Two", S_user: "user2", email: "u2@bayan.test", Bio: "", followers: 0, following: 3, Posters: "", settings: {}, createdTs: Date.now() },
    "posts/p1": { id: "p1", content: "Hello world post", autherID: "u1", likes: 4, views: 40, ts: Date.now(), cat: "tech" },
    "posts/p2": { id: "p2", content: "Second post", autherID: "u2", likes: 1, views: 10, ts: Date.now() - 3600000, cat: "art" },
    "articles/a1": { id: "a1", title: "Article one", content: "Long form", autherID: "u1", likes: 7, views: 100, ts: Date.now() },
    "novels/n1": { id: "n1", title: "Novel one", content: "Chapter 1", autherID: "u2", likes: 9, views: 200, ts: Date.now() },
};
const ref = (db, path) => ({ path });
const set = async (r, value) => { if (value === null) delete store[r.path]; else store[r.path] = value; };
const get = async (r) => ({
    exists: () => {
        if (store[r.path] !== undefined) return true;
        return Object.keys(store).some((k) => k === r.path || k.startsWith(r.path + "/"));
    },
    val: () => {
        if (store[r.path] !== undefined) return store[r.path];
        // hierarchical aggregation: build subtree from leaf paths
        const prefix = r.path + "/";
        const out = {};
        let any = false;
        for (const k of Object.keys(store)) {
            if (k.startsWith(prefix)) {
                any = true;
                const rest = k.slice(prefix.length);
                const parts = rest.split("/");
                let node = out;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) node[parts[i]] = {};
                    node = node[parts[i]];
                }
                node[parts[parts.length - 1]] = store[k];
            }
        }
        return any ? out : null;
    },
});
const push = (db, path) => ({ path: path + "/auto" + Math.random().toString(36).slice(2) });
const remove = async (r) => { delete store[r.path]; };
const update = set;
module.exports = {
    store,
    db: {},
    ref, set, get, push, remove, update,
    child: (r, sub) => ({ path: r.path + "/" + sub }),
    query: (...a) => a[0],
    equalTo: () => ({}),
    orderByChild: () => ({}),
    limitToLast: () => ({}),
    limitToFirst: () => ({}),
    runTransaction: async (tref, fn) => fn({ val: () => store[tref.path], exists: () => store[tref.path] !== undefined }),
    onValue: () => () => { },
};
