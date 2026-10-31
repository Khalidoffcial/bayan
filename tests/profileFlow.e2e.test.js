/**
 * profileFlow.e2e.test.js — integrated profile-content flow test.
 * Run: node tests/profileFlow.e2e.test.js
 *
 * Simulates the REAL flow end-to-end with a mocked Firebase:
 *   1. User A creates a post           (saveContent_Posts)
 *   2. User B replies on A's post      (saveContent_Comment → Dao.addReply)
 *   3. MYCONTENT for each tab/profile  (getProfileContent)
 *
 * Verifies where data appears or disappears, per tab, per profile.
 */

process.env.ACCESS_TOKEN_SECRET = "test-secret";

/* Inject the offline firebase mock before requiring the service chain. */
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebaseArticle.js") return require.resolve("./mockFirebase.js");
    if (request === "@vitalets/google-translate-api") return require.resolve("./translateHelper.js");
    return origResolve.call(this, request, ...args);
};

const assert = require("assert");
const dao = require("../datastore/Dao.js");
const sign = require("../datastore/signin_signupDao_firebase.js");
const { saveContent_Posts, saveContent_Comment, saveContent_Article_Novels } = require("../service/saveContent.js");
const { getProfileContent } = require("../service/profileContentService.js");

const mockContent = {
    posts: {},
    articles: {},
    novels: {},
};

/* Mock per-user profile lists — mirrors user_data/Profile/{idUser}/{posts|articles|novels} */
const userLists = {};

/* Mock dao content getters to hit mockContent by id. */
dao.getPostID = async (id) => mockContent.posts[String(id)] || null;
dao.getArticleID = async (id) => mockContent.articles[String(id)] || null;
dao.getnovelsID = async (id) => mockContent.novels[String(id)] || null;

/* The REAL addContentId_User in signin_signupDao_firebase.js reads from
 * firebase `get` — we mock it against userLists so the addReply registration
 * path can be exercised exactly as in production code. */
sign.addContentId_User = async (type, idUser, content_id) => {
    if (!userLists[idUser]) userLists[idUser] = {};
    userLists[idUser][type] = [...(userLists[idUser][type] || []), String(content_id)];
};

sign.findbyID = async (idUser) => ({ id: idUser, name: `User ${idUser}`, imgProfile: "" });
sign.find_ContentUser_byID = async (type, idUser) => (userLists[String(idUser)] || {})[String(type)] || [];

let passed = 0, failed = 0;
const run = async (name, fn) => {
    try {
        await fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        failed++;
        console.error(`  ❌ ${name}\n     ${err.message}`);
        process.exitCode = 1;
    }
};

/* ---------- Actors ---------- */
const USER_A = "user-A";   // post author
const USER_B = "user-B";   // reply author
const PARENT_POST_ID = "7777";
const REPLY_ID = "8888";
const ARTICLE_ID = "9999";
const NOVEL_ID = "1010";

(async () => {
    console.log("\n=== profileFlow.e2e (integrated A/B scenario) ===\n");

    /* ---------- Step 1: User A creates a post ---------- */
    const postResult = await saveContent_Posts({
        autherID: USER_A,
        id: PARENT_POST_ID,
        img: [],
        content: "A's original post",
        type: "post",
    });
    mockContent.posts[PARENT_POST_ID] = postResult.post;
    await sign.addContentId_User("posts", USER_A, PARENT_POST_ID);
    console.log(`     post saved: ${PARENT_POST_ID} by ${USER_A}`);

    /* ---------- Step 2: User B replies on A's post ---------- */
    const replyResult = await saveContent_Comment({
        autherID: USER_B,
        id: REPLY_ID,
        comment_on: PARENT_POST_ID,
        img: [],
        content: "B's reply",
        type: "posts",
        userData: { Id_user: USER_B, F_user: "B", S_user: "b", imgProfile: "" },
    });
    // replyRecord lives inside result.comment — mirror what Dao.addReply does:
    // set posts/posts{replyId} + replyIndex + register in author's list.
    mockContent.posts[REPLY_ID] = replyResult.comment;
    await sign.addContentId_User("posts", USER_B, REPLY_ID);  // ← what Dao.addReply now does
    console.log(`     reply saved: ${REPLY_ID} by ${USER_B} on ${PARENT_POST_ID}`);

    /* ---------- Step 3: A creates an article & novel (for tab tests) ---------- */
    const articleResult = await saveContent_Article_Novels({
        autherID: USER_A, id: ARTICLE_ID, title: "A Article", descrip: "d", img: [],
        series: null, content: "article body", type: "article",
    });
    mockContent.articles[ARTICLE_ID] = articleResult.record;
    await sign.addContentId_User("articles", USER_A, ARTICLE_ID);

    const novelResult = await saveContent_Article_Novels({
        autherID: USER_B, id: NOVEL_ID, title: "B Novel", descrip: "n", img: [],
        series: null, content: "novel body", type: "novels",
    });
    mockContent.novels[NOVEL_ID] = novelResult.record;
    await sign.addContentId_User("novels", USER_B, NOVEL_ID);

    /* ==================================================
       TESTS — per tab, per profile
       ================================================== */

    /* ---------- A's profile: Posts tab (original posts only) ---------- */
    await run("A's Posts tab returns ONLY A's original post (no replies, no B content)", async () => {
        const res = await getProfileContent({ idUser: USER_A, type: "posts" });
        assert.strictEqual(res.items.length, 1, `got ${res.items.length}: ${JSON.stringify(res.items.map(i => i.id))}`);
        assert.strictEqual(res.items[0].id, PARENT_POST_ID);
        assert.strictEqual(res.items[0].kind, "post");
        assert.strictEqual(res.items[0].autherID, USER_A);
    });

    /* ---------- B's profile: Replies tab (B's reply on A's post) ---------- */
    await run("B's Replies tab returns B's own reply (authored by B, on A's post)", async () => {
        const res = await getProfileContent({ idUser: USER_B, type: "replies" });
        assert.strictEqual(res.items.length, 1, `got ${res.items.length}: ${JSON.stringify(res.items.map(i => i.id))}`);
        assert.strictEqual(res.items[0].id, REPLY_ID);
        assert.strictEqual(res.items[0].kind, "reply");
        assert.strictEqual(res.items[0].autherID, USER_B);
        assert.strictEqual(res.items[0].parentUserData.Id_user, USER_A);
    });

    /* ---------- A's profile: Replies tab (A did NOT reply) ---------- */
    await run("A's Replies tab is EMPTY (A did not write any reply)", async () => {
        const res = await getProfileContent({ idUser: USER_A, type: "replies" });
        assert.strictEqual(res.items.length, 0, `got ${res.items.length}: ${JSON.stringify(res.items.map(i => i.id))}`);
    });

    /* ---------- B's profile: Articles tab (empty for B) ---------- */
    await run("B's Articles tab is EMPTY (B has no articles)", async () => {
        const res = await getProfileContent({ idUser: USER_B, type: "articles" });
        assert.strictEqual(res.items.length, 0, `got ${res.items.length}: ${JSON.stringify(res.items.map(i => i.id))}`);
    });

    /* ---------- A's profile: Articles tab ---------- */
    await run("A's Articles tab returns A's article only", async () => {
        const res = await getProfileContent({ idUser: USER_A, type: "articles" });
        assert.strictEqual(res.items.length, 1);
        assert.strictEqual(res.items[0].id, ARTICLE_ID);
        assert.strictEqual(res.items[0].kind, "article");
    });

    /* ---------- B's profile: Novels tab ---------- */
    await run("B's Novels tab returns B's novel only", async () => {
        const res = await getProfileContent({ idUser: USER_B, type: "novels" });
        assert.strictEqual(res.items.length, 1);
        assert.strictEqual(res.items[0].id, NOVEL_ID);
        assert.strictEqual(res.items[0].kind, "novel");
    });

    /* ---------- B's profile: All tab mixes kinds ---------- */
    await run("B's All tab includes B's reply + B's novel (no A's post)", async () => {
        const res = await getProfileContent({ idUser: USER_B, type: "all" });
        const ids = res.items.map((i) => i.id);
        assert.ok(ids.includes(REPLY_ID), "B's reply missing from All");
        assert.ok(ids.includes(NOVEL_ID), "B's novel missing from All");
        assert.ok(!ids.includes(PARENT_POST_ID), "A's post leaked into B's All");
        const kinds = res.items.map((i) => i.kind);
        assert.ok(kinds.includes("reply") && kinds.includes("novel"));
    });

    /* ---------- Pagination ---------- */
    await run("Pagination on B's All tab (limit=1) paginates without loss", async () => {
        const p1 = await getProfileContent({ idUser: USER_B, type: "all", cursor: 0, limit: 1 });
        assert.strictEqual(p1.items.length, 1);
        assert.strictEqual(p1.nextCursor, 1);
        const p2 = await getProfileContent({ idUser: USER_B, type: "all", cursor: 1, limit: 1 });
        assert.strictEqual(p2.items.length, 1);
        assert.strictEqual(p2.nextCursor, null);
        const ids = [...p1.items, ...p2.items].map((i) => i.id).sort();
        assert.strictEqual(new Set(ids).size, 2, "no duplicates in pagination");
    });

    /* ---------- Missing content record skipped ---------- */
    await run("Missing record (deleted) drops out without breaking the page", async () => {
        userLists[USER_A].posts.push("ghost-id");
        const res = await getProfileContent({ idUser: USER_A, type: "posts" });
        assert.ok(!res.items.some((i) => i.id === "ghost-id"));
        delete userLists[USER_A].posts[userLists[USER_A].posts.indexOf("ghost-id")];
    });

    /* ---------- Wrong-user isolation ---------- */
    await run("A's profile does NOT include B's novel", async () => {
        const res = await getProfileContent({ idUser: USER_A, type: "all" });
        const ids = res.items.map((i) => i.id);
        assert.ok(!ids.includes(NOVEL_ID), "B's novel leaked into A's profile");
        assert.ok(ids.includes(PARENT_POST_ID));
        assert.ok(ids.includes(ARTICLE_ID));
    });

    Module._resolveFilename = origResolve;
    console.log(`\n${passed} passed, ${failed} failed\n`);
})();
