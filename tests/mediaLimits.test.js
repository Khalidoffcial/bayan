/**
 * Media limits — standalone test script (server-side contract).
 * Run: node tests/mediaLimits.test.js
 *
 * Exercises cloudinary.service.validateMediaManifest + extractCloudinaryAssets
 * with mocked cloudinary + firebase modules (no live calls).
 */

process.env.ACCESS_TOKEN_SECRET = "test-secret";

const assert = require("assert");

/* Mock cloudinary (no live API) */
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === "cloudinary") {
        return require.resolve("./mockCloudinary.js");
    }
    return origResolve.call(this, request, ...args);
};

const { validateMediaManifest, extractCloudinaryAssets, MEDIA_LIMITS } = require("../service/cloudinary.service.js");

Module._resolveFilename = origResolve;

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

const image = (i) => ({ kind: "image", url: `https://res.cloudinary.com/demo/image/upload/v1/bayan/media/image/p${i}.jpg`, publicId: `p${i}` });
const video = (duration) => ({ kind: "video", url: "https://res.cloudinary.com/demo/video/upload/v1/bayan/media/video/vid.mp4", publicId: "vid", duration });

console.log("\nmediaLimits.test.js\n");

run("1. More than 4 images rejected (server-side)", () => {
    const result = validateMediaManifest([image(1), image(2), image(3), image(4), image(5)]);
    assert.strictEqual(result.ok, false);
    assert.match(result.message, /4/);
});

run("2. Exactly 4 images accepted", () => {
    const result = validateMediaManifest([image(1), image(2), image(3), image(4)]);
    assert.strictEqual(result.ok, true);
});

run("3. Video under 30s accepted", () => {
    const result = validateMediaManifest([video(29.9)]);
    assert.strictEqual(result.ok, true);
});

run("4. Video of 30s or more rejected", () => {
    const result = validateMediaManifest([video(30)]);
    assert.strictEqual(result.ok, false);
    assert.match(result.message, /30/);
});

run("5. Second video rejected", () => {
    const result = validateMediaManifest([video(10), video(20)]);
    assert.strictEqual(result.ok, false);
    assert.match(result.message, /فيديو واحد/);
});

run("6. extractCloudinaryAssets parses publicId + resourceType", () => {
    const assets = extractCloudinaryAssets([
        image(1),
        { kind: "video", url: "https://res.cloudinary.com/demo/video/upload/v1/bayan/media/video/abc.mp4", publicId: "abc" },
        "https://firebasestorage.googleapis.com/v0/b/app/o/old.jpg", // legacy — must be skipped
        "https://external-host.com/x.png", // foreign — skipped
    ]);
    assert.strictEqual(assets.length, 2);
    assert.strictEqual(assets[0].resourceType, "image");
    assert.strictEqual(assets[1].resourceType, "video");
    assert.strictEqual(assets[1].publicId, "bayan/media/video/abc");
});

run("7. Empty manifest accepted", () => {
    assert.strictEqual(validateMediaManifest([]).ok, true);
    assert.strictEqual(validateMediaManifest(undefined).ok, true);
});

run("8. Limits values match the product contract", () => {
    assert.strictEqual(MEDIA_LIMITS.MAX_IMAGES, 4);
    assert.strictEqual(MEDIA_LIMITS.MAX_VIDEO_SECONDS, 30);
});

console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}\n`);
