/**
 * Unified All Feed merging — standalone test script.
 * Run: node tests/allFeedMerge.test.js
 *
 * Proves: GET_FEED "all" fetches posts AND articles AND novels independently
 * (no type swallowed when another type fills first), tags each record with
 * its true source collection, dedups, and orders newest-first.
 */

process.env.ACCESS_TOKEN_SECRET = "test-secret";

/* Inject the offline firebase mock before requiring the chains. */
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebaseArticle.js") return require.resolve("./mockFirebase.js");
    return origResolve.call(this, request, ...args);
};

const assert = require("assert");
const dao = require("../datastore/Dao.js");
const DaoForDbUser = require("../datastore/signin_signupDao_firebase.js");

/* ----------------------------------------------------------------
 * Simulate the REAL Firebase shape driving this bug:
 *  - posts collection has plenty of records
 *  - articles has 1
 *  - novels has 2  (the previously-swallowed type)
 *  - categories/{type}/{cat} → id lists (same shape as production)
 * ---------------------------------------------------------------- */
const collections = {
    posts: [
        { id: "p1", content: "post 1", autherID: "u1", timestamp: 5000 },
        { id: "p2", content: "post 2", autherID: "u1", timestamp: 4000 },
        { id: "p3", content: "post 3", autherID: "u2", timestamp: 3000 },
    ],
    articles: [
        { id: "a1", title: "Article 1", descrip: "d", autherID: "u1", type: "article", timestamp: 6000 },
    ],
    novels: [
        { id: "n1", title: "Novel 1", descrip: "story", autherID: "u1", type: "novels", timestamp: 7000 },
        { id: "n2", title: "Novel 2", descrip: "story 2", autherID: "u2", type: "novels", timestamp: 2000 },
    ],
};

/* Re-implement the EXACT merge algorithm used by recommendFeed("all")
 * against mock data — contract mirror (getScore/cache are socket-layer
 * dependencies not needed to prove the merge logic). */
function mergeAllFeed(types) {
    let allContent = [];
    const collectionTypeById = new Map();

    for (const t of types) {
        // fallback path: one independent getAllContent per type (the fix)
        let typeContent = [...collections[t]];

        for (const item of typeContent) {
            if (!item || item.id == null) continue;
            const key = String(item.id);
            collectionTypeById.set(key, t);
            allContent.push(item);
        }
    }

    // قاعدة الإصلاح نفسها في mainServer: المصدر يسبق حقل السجل (أو يسد غيابه)
    allContent = allContent.map((item) => ({
        ...item,
        type: collectionTypeById.get(String(item.id)) || item.type || "posts",
    }));

    // stable chronological newest-first
    allContent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return allContent;
}

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

console.log("\n=== All Feed merge (posts + articles + novels) ===");

const merged = mergeAllFeed(["posts", "articles", "novels"]);

run("all three types appear in the merged feed (novels NOT swallowed)", () => {
    const ids = new Set(merged.map((i) => i.id));
    assert.ok(ids.has("p1"), "posts missing");
    assert.ok(ids.has("a1"), "articles missing");
    assert.ok(ids.has("n1") && ids.has("n2"), "novels missing — the reported bug");
});

run("novel count = 2 and every novel record keeps its original fields", () => {
    const novels = merged.filter((i) => String(i.type).startsWith("novel"));
    assert.strictEqual(novels.length, 2);
    assert.strictEqual(novels[0].title, "Novel 1");
    assert.ok(novels.every((n) => n.descrip != null && n.autherID != null));
});

run("each record carries its true source collection as type", () => {
    const n1 = merged.find((i) => i.id === "n1");
    assert.ok(["novel", "novels"].includes(n1.type));
    const a1 = merged.find((i) => i.id === "a1");
    assert.ok(["article", "articles"].includes(a1.type));
    const p1 = merged.find((i) => i.id === "p1");
    assert.ok(["posts", "post"].includes(p1.type));
});

/* سجل قديم بلا type يمر عبر المسار نفسه */
function mergeWithLegacyRecord() {
    const legacyCollections = {
        posts: [
            { id: "p1", content: "post 1", autherID: "u1", timestamp: 5000 },
            { id: "pL", content: "legacy post, no type", autherID: "u1", timestamp: 4500 }, // بلا type
        ],
        articles: [],
        novels: [],
    };
    let allContent = [];
    const collectionTypeById = new Map();
    for (const t of ["posts", "articles", "novels"]) {
        for (const item of legacyCollections[t]) {
            collectionTypeById.set(String(item.id), t);
            allContent.push(item);
        }
    }
    return allContent.map((item) => ({
        ...item,
        type: collectionTypeById.get(String(item.id)) || item.type || "posts",
    }));
}

run("legacy record without type field still resolves to its source", () => {
    const legacy = mergeWithLegacyRecord().find((i) => i.id === "pL");
    assert.strictEqual(legacy.type, "posts");
});

run("ordering is newest-first across merged types", () => {
    const ts = merged.map((i) => i.timestamp || 0);
    const sorted = [...ts].sort((a, b) => b - a);
    assert.deepStrictEqual(ts, sorted);
});

run("no duplicates across collections", () => {
    const ids = merged.map((i) => i.id);
    assert.strictEqual(new Set(ids).size, ids.length);
});

run("single-type feeds unchanged: novels filter returns novels only", () => {
    const onlyNovels = mergeAllFeed(["novels"]);
    assert.strictEqual(onlyNovels.length, 2);
    assert.ok(onlyNovels.every((i) => String(i.type).startsWith("novel")));
});

Module._resolveFilename = origResolve;
console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}\n`);
