/**
 * Single-element Firebase list regression test.
 *
 * Firebase Realtime Database stores an array with ONE element as a plain
 * STRING value (not an array). find_ContentUser_byID then returns e.g.
 * `"7777"` instead of `["7777"]`, and getProfileContent dropped it →
 * empty tabs for users with exactly one post/article/novel/reply.
 */
process.env.ACCESS_TOKEN_SECRET = "test-secret";

const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebaseArticle.js") return require.resolve("./mockFirebase.js");
    if (request === "./firebase") return require.resolve("./mockFirebase.js");
    return origResolve.call(this, request, ...args);
};

const assert = require("assert");
const { getProfileContent } = require("../service/profileContentService.js");
const DaoForDbUser = require("../datastore/signin_signupDao_firebase.js");

const mockContent = {
    posts: { "7777": { autherID: "uA", id: "7777", content: "only post", type: "post", timestamp: 1000 } },
    articles: { "9999": { autherID: "uA", id: "9999", title: "only article", type: "article", timestamp: 500 } },
    novels: {},
};

/* 🔴 The bug: Firebase returns a STRING when the list has one element. */
DaoForDbUser.find_ContentUser_byID = async (type, idUser) => {
    if (idUser !== "uA") return [];
    if (type === "posts") return "7777";    // ← string, NOT ["7777"]
    if (type === "articles") return "9999"; // ← string, NOT ["9999"]
    return [];
};
DaoForDbUser.findbyID = async () => ({ id: "uA", name: "A" });

const dao = require("../datastore/Dao.js");
dao.getPostID = async (id) => mockContent.posts[String(id)] || null;
dao.getArticleID = async (id) => mockContent.articles[String(id)] || null;
dao.getnovelsID = async () => null;

(async () => {
    console.log("\n=== single-element firebase list regression ===\n");

    const posts = await getProfileContent({ idUser: "uA", type: "posts" });
    console.log(`   posts tab items: ${posts.items.length}`);
    assert.strictEqual(posts.items.length, 1, "single-string post id must still resolve");

    const articles = await getProfileContent({ idUser: "uA", type: "articles" });
    console.log(`   articles tab items: ${articles.items.length}`);
    assert.strictEqual(articles.items.length, 1, "single-string article id must still resolve");

    const all = await getProfileContent({ idUser: "uA", type: "all" });
    console.log(`   all tab items: ${all.items.length}`);
    assert.strictEqual(all.items.length, 2, "both single-string ids must merge");

    console.log("\n   before fix: this test fails with 0 items (ids dropped as non-array)");
    console.log("   after  fix: 2 items found — matches real Firebase behavior\n");

    Module._resolveFilename = origResolve;
    console.log("✅ single-element regression passed\n");
})().catch((e) => { console.error("❌ FAILED:", e.message); process.exit(1); });
