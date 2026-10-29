/**
 * Comment persistence & feed isolation — standalone test script.
 * Run: node tests/commentPersistence.test.js
 *
 * Exercises saveContent_Comment() + Dao.addComment/getComments logic with a
 * mocked firebase layer (no live Firebase writes).
 */

process.env.ACCESS_TOKEN_SECRET = "test-secret";

const assert = require("assert");

/* ---------- Mock firebase layer ---------- */
const store = {};

const ref = (path) => ({ path });
const set = async (r, value) => { store[r.path] = value; };
const get = async (r) => ({
    exists: () => store[r.path] !== undefined,
    val: () => store[r.path],
});

const daoModulePath = "../datastore/Dao.js";
const firebaseModule = require.cache[require.resolve(daoModulePath)];

// Inject mocks before requiring Dao
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "./firebaseArticle.js") {
        return require.resolve("./mockFirebase.js");
    }
    return origResolve.call(this, request, ...args);
};

const dao = require(daoModulePath);
Module._resolveFilename = origResolve;

/* ---------- Mock saveContent helpers ---------- */
const getCurrentTime = () => "12:00:00";
const getTodayDate = () => "2026-10-29";

/* ---------- saveContent_Comment (copied contract under test) ---------- */
const { saveContent_Comment } = require("../service/saveContent.js");

let passed = 0;
const run = (name, fn) => {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err.message);
        process.exitCode = 1;
    }
};

const validPayload = {
    autherID: "463904916",
    id: "1730000000000587",
    comment_on: "4621",
    content: "Nice post!",
    type: "posts",
    img: [],
    userData: { Id_user: "463904916", F_user: "Khalid", S_user: "@khalid", imgProfile: "" },
};

console.log("\ncommentPersistence.test.js\n");

const runAsync = (name, fn) => {
    fn()
        .then(() => {
            passed++;
            console.log(`  ✓ ${name}`);
        })
        .catch((err) => {
            console.error(`  ✗ ${name}`);
            console.error(err.message);
            process.exitCode = 1;
        });
};

runAsync("1. Valid reply is persisted with comment_on and author ID", async () => {
    const result = await saveContent_Comment(validPayload);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.comment.comment_on, "4621");
    assert.strictEqual(result.comment.autherID, "463904916");
});

run("2. Invalid requests fail with a message (maps to HTTP 400)", async () => {
    const missing = await saveContent_Comment({ ...validPayload, autherID: undefined });
    assert.strictEqual(missing.success, false);

    const noParent = await saveContent_Comment({ ...validPayload, comment_on: undefined });
    assert.strictEqual(noParent.success, false);

    const tooLong = await saveContent_Comment({ ...validPayload, content: "x".repeat(1001) });
    assert.strictEqual(tooLong.success, false);
});

runAsync("3. Type outside allowed list normalizes to 'posts'", async () => {
    const result = await saveContent_Comment({ ...validPayload, type: "hacker" });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.comment.parentType, "posts");
});

runAsync("4. img normalizes to array", async () => {
    const result = await saveContent_Comment({ ...validPayload, img: undefined });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.comment.img, []);
});

runAsync("5. Reply carries canonical post fields (category, replyCount, timestamps)", async () => {
    const result = await saveContent_Comment(validPayload);
    assert.strictEqual(result.success, true);
    assert.ok(result.comment.category && typeof result.comment.category === "object");
    assert.strictEqual(result.comment.replyCount, 0);
    assert.ok(result.comment.timestamp > 0);
    assert.ok(result.comment.id);
});

console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}\n`);
