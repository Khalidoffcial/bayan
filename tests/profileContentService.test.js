/**
 * Unified profile content service — standalone test script.
 * Run: node tests/profileContentService.test.js
 *
 * Exercises getProfileContent() with a mocked firebase layer (no live
 * Firebase reads). Covers: aggregation across posts/replies/articles/novels,
 * real-author resolution, chronological ordering, dedup, pagination,
 * deleted content handling and safe handling of records without dates.
 */

process.env.ACCESS_TOKEN_SECRET = "test-secret";

/* Inject the offline firebase mock before requiring the service chain. */
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebaseArticle.js") return require.resolve("./mockFirebase.js");
    if (request === "./firebase") return require.resolve("./mockFirebase.js");
    return origResolve.call(this, request, ...args);
};

const assert = require("assert");

const dao = require("../datastore/Dao.js");
const DaoForDbUser = require("../datastore/signin_signupDao_firebase.js");
const { getProfileContent } = require("../service/profileContentService.js");

/* Seed the mock store: user profile with per-collection id lists + content. */
const storeRef = require.cache[require.resolve("./mockFirebase.js")];
// mockFirebase keeps `store` private; instead we write through the DAOs.
const seedProfile = (userId, profile) =>
    dao.update ? null : null; // noop — real writes happen via mocked set below

let passed = 0;
const run = (name, fn) => {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        console.error(`  ❌ ${name}\n     ${err.message}`);
        process.exitCode = 1;
    }
};

console.log("\n=== profileContentService (unified profile content) ===");

/* In-memory content that simulates what the real Firebase paths hold. */
const mockContent = {
    posts: {
        "11": { autherID: "u1", id: "11", content: "post u1", type: "post", timestamp: 4000 },
        "12": { autherID: "u1", id: "12", content: "reply by u1 on u2's post", comment_on: "21", parentType: "posts", type: "post", timestamp: 5000, parentUserData: { Id_user: "u2", S_user: "@u2" } },
        "13": { autherID: "u1", id: "13", content: "nested reply on reply 12", comment_on: "12", parentType: "posts", type: "post", timestamp: 6000, parentUserData: { Id_user: "u2", S_user: "@u2" } },
        "21": { autherID: "u2", id: "21", content: "u2's own post", type: "post", timestamp: 5500 },
        "14": { autherID: "u1", id: "14", content: "u1 post with no timestamp, only date", date: "29 Oct 2026", time: "10:00:00" },
    },
    articles: {
        "31": { autherID: "u1", id: "31", title: "u1 article", descrip: "about articles", type: "article", timestamp: 3000 },
        "32": { autherID: "u1", id: "31", title: "u1 article duplicate", descrip: "same id in two sources", type: "article", timestamp: 9999 },
    },
    novels: {
        "41": { autherID: "u1", id: "41", title: "u1 novel", descrip: "a story", type: "novels", timestamp: 2000 },
    },
};

/* Mock the per-user id lists through the DAO lookup used by the service. */
const userLists = {
    u1: { posts: ["11", "12", "13", "14", "missing-1"], articles: ["31", "32"], novels: ["41"] },
    u2: { posts: ["21"], articles: [], novels: [] },
    u3: { posts: [], articles: [], novels: [] }, // empty profile
};

/* Monkey-patch the mock firebase `get` so paths resolve to mockContent. */
const mockFirebasePath = require.resolve("./mockFirebase.js");
const mockFirebase = require.cache[mockFirebasePath];
const originalMockGet = mockFirebase.exports.get;
// The service reads via Dao → mockFirebase.get(ref). Paths arrive as "posts/posts11" etc.

/* Instead of patching get (paths are plain strings), simulate content by
 * pre-loading the mock store — rewrite its private store through a fresh
 * module instance. Simpler: patch dao content getters. */
const daoOriginal = { getPostID: dao.getPostID, getArticleID: dao.getArticleID, getnovelsID: dao.getnovelsID };
dao.getPostID = async (id) => mockContent.posts[String(id)] || null;
dao.getArticleID = async (id) => mockContent.articles[String(id)] || null;
dao.getnovelsID = async (id) => mockContent.novels[String(id)] || null;

DaoForDbUser.find_ContentUser_byID = async (type, idUser) =>
    (userLists[String(idUser)] || {})[String(type)] || [];
DaoForDbUser.findbyID = async (idUser) =>
    userLists[String(idUser)] !== undefined
        ? { id: idUser, name: `User ${idUser}`, imgProfile: "" }
        : null;

(async () => {
    /* ---------- Test 1: empty profile ---------- */
    const empty = await getProfileContent({ idUser: "u3", type: "all" });
    run("empty profile returns no items and no next cursor", () => {
        assert.strictEqual(empty.items.length, 0);
        assert.strictEqual(empty.nextCursor, null);
        assert.strictEqual(empty.counts.all, 0);
    });

    /* ---------- Test 2: full aggregation + ordering ---------- */
    const all = await getProfileContent({ idUser: "u1", type: "all" });
    run("aggregates all four kinds and orders newest first by original timestamp", () => {
        const kinds = all.items.map((i) => i.kind);
        assert.ok(kinds.includes("post") && kinds.includes("reply") && kinds.includes("article") && kinds.includes("novel"));
        const ts = all.items.map((i) => i.timestamp);
        const sorted = [...ts].sort((a, b) => b - a);
        assert.deepStrictEqual(ts, sorted);
    });

    run("replies are included, even nested replies on another user's post", () => {
        assert.ok(all.items.some((i) => i.id === "12" && i.kind === "reply"));
        assert.ok(all.items.some((i) => i.id === "13" && i.kind === "reply"));
    });

    run("real author is resolved per item, never the parent's author", () => {
        const reply = all.items.find((i) => i.id === "12");
        assert.strictEqual(reply.autherID, "u1");
        assert.strictEqual(reply.parentUserData.Id_user, "u2"); // context only
    });

    run("missing content record (deleted) is skipped without breaking the page", () => {
        assert.ok(!all.items.some((i) => i.id === "missing-1"));
        assert.strictEqual(all.counts.all, all.items.length);
    });

    run("record without timestamp but with date+time is sorted safely", () => {
        const item = all.items.find((i) => i.id === "14");
        assert.ok(item);
        assert.ok(item.timestamp > 0);
    });

    /* ---------- Test 3: dedup ---------- */
    run("the same id appearing in two sources merges once (no duplicates)", () => {
        const ids = all.items.map((i) => i.id);
        assert.strictEqual(new Set(ids).size, ids.length);
    });

    /* ---------- Test 4: tab filters ---------- */
    run("posts tab returns ORIGINAL posts only (no replies mixed in)", async () => {
        const posts = await getProfileContent({ idUser: "u1", type: "posts" });
        assert.ok(posts.items.length > 0);
        assert.ok(posts.items.every((i) => i.kind === "post"));
    });

    run("replies tab returns ONLY the profile owner's replies (incl. nested)", async () => {
        const replies = await getProfileContent({ idUser: "u1", type: "replies" });
        assert.ok(replies.items.length > 0);
        assert.ok(replies.items.every((i) => i.kind === "reply"));
        // nested reply on a reply (id 13 → parent 12) is included
        assert.ok(replies.items.some((i) => i.id === "13"));
        // replies by OTHERS on the owner's posts are NOT here
        assert.ok(!replies.items.some((i) => i.autherID !== "u1"));
    });

    run("articles tab returns articles only", async () => {
        const articles = await getProfileContent({ idUser: "u1", type: "articles" });
        assert.ok(articles.items.every((i) => i.kind === "article"));
        assert.strictEqual(articles.counts.all, 1); // dup 31/32 collapses
    });

    run("novels tab returns novels only", async () => {
        const novels = await getProfileContent({ idUser: "u1", type: "novels" });
        assert.ok(novels.items.every((i) => i.kind === "novel"));
        assert.strictEqual(novels.counts.all, 1);
    });

    /* ---------- Test 5: pagination without dup/loss ---------- */
    run("pagination advances without duplicates or lost items", async () => {
        const page1 = await getProfileContent({ idUser: "u1", type: "all", cursor: 0, limit: 2 });
        assert.strictEqual(page1.items.length, 2);
        assert.strictEqual(page1.nextCursor, 2);

        const page2 = await getProfileContent({ idUser: "u1", type: "all", cursor: 2, limit: 2 });
        const merged = [...page1.items, ...page2.items].map((i) => i.id);
        assert.strictEqual(new Set(merged).size, merged.length);
        assert.strictEqual(page2.nextCursor, 4);

        const page3 = await getProfileContent({ idUser: "u1", type: "all", cursor: 4, limit: 2 });
        const full = [...merged, ...page3.items.map((i) => i.id)];
        const unpaginated = await getProfileContent({ idUser: "u1", type: "all", cursor: 0, limit: 50 });
        assert.deepStrictEqual(full.sort(), unpaginated.items.map((i) => i.id).sort());
        assert.strictEqual(page3.nextCursor, null);
    });

    /* ---------- Test 6: other user's profile shows only their content ---------- */
    const otherUser = await getProfileContent({ idUser: "u2", type: "all" });
    run("opening another user's profile shows their content only", () => {
        assert.strictEqual(otherUser.items.length, 1);
        assert.strictEqual(otherUser.items[0].autherID, "u2");
        assert.strictEqual(otherUser.items[0].id, "21");
    });

    /* ---------- Test 7: missing user ---------- */
    run("missing user list returns empty feed safely", async () => {
        const nobody = await getProfileContent({ idUser: "ghost", type: "all" });
        assert.strictEqual(nobody.items.length, 0);
    });

    Module._resolveFilename = origResolve;
    console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}\n`);
})();
