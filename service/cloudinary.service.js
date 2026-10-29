/**
 * Cloudinary signed-upload + media deletion service (server-side only).
 *
 * Security rules honored here:
 *  - CLOUDINARY_API_SECRET lives ONLY on the server; never sent to the client.
 *  - Signature params are fixed server-side; the client cannot relax them.
 *  - Media deletion runs only here, with trusted credentials.
 */
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");
const { db, ref, get } = require("../datastore/firebaseArticle.js");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "febrl3bn";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "bayan_space";

/** Product limits (mirrored client-side by media.service.js). */
const MEDIA_LIMITS = {
    MAX_IMAGES: 4,               // per post/reply
    MAX_VIDEO_SECONDS: 30,       // duration < 30s
    MAX_IMAGE_BYTES: 10 * 1024 * 1024,  // 10 MB per image
    MAX_VIDEO_BYTES: 50 * 1024 * 1024,  // 50 MB per video
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"], // mp4/webm/mov
};

const isConfigured = () =>
    Boolean(
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_CLOUD_NAME
    );

/**
 * Builds a signed-upload payload for a DIRECT (browser → Cloudinary) upload.
 * Signature covers ONLY the safe params below — the client cannot add
 * eager transformations, resource_type overrides, or public_id choices.
 *
 * @param {{ kind: "image"|"video", folder?: string }} params
 */
function buildSignedUpload({ kind = "image" } = {}) {
    if (!isConfigured()) {
        return { ok: false, message: "Cloudinary is not configured on the server" };
    }

    const folder = kind === "video" ? "bayan/media/video" : "bayan/media/image";
    const timestamp = Math.round(Date.now() / 1000);

    // Exactly the params the client will send — nothing else is signed,
    // and unsigned extra params are rejected by Cloudinary.
    const paramsToSign = {
        folder,
        upload_preset: UPLOAD_PRESET,
        timestamp,
    };

    const signature = crypto
        .createHash("sha1")
        .update(
            Object.keys(paramsToSign)
                .sort()
                .map((k) => `${k}=${paramsToSign[k]}`)
                .join("&") + process.env.CLOUDINARY_API_SECRET
        )
        .digest("hex");

    return {
        ok: true,
        upload: {
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: CLOUD_NAME,
            timestamp,
            folder,
            uploadPreset: UPLOAD_PRESET,
            signature,
            resourceType: kind === "video" ? "video" : "image",
        },
    };
}

/**
 * Server-side validation of declared media metadata before persistence.
 * The client reports duration; video duration is ALSO verified by
 * Cloudinary itself after upload via the returned record (duration field).
 */
function validateMediaManifest(media = []) {
    if (!Array.isArray(media)) {
        return { ok: false, message: "Invalid media payload" };
    }

    const images = media.filter((m) => m.kind === "image");
    const videos = media.filter((m) => m.kind === "video");

    if (images.length > MEDIA_LIMITS.MAX_IMAGES) {
        return { ok: false, message: `الحد الأقصى ${MEDIA_LIMITS.MAX_IMAGES} صور لكل منشور` };
    }
    if (videos.length > 1) {
        return { ok: false, message: "فيديو واحد فقط لكل منشور أو رد" };
    }
    if (
        videos.length === 1 &&
        Number(videos[0].duration ?? 0) >= MEDIA_LIMITS.MAX_VIDEO_SECONDS
    ) {
        return { ok: false, message: "مدة الفيديو يجب أن تكون أقل من 30 ثانية" };
    }

    return { ok: true };
}

/**
 * Extracts Cloudinary identifiers from any legacy or new media shape.
 * Returns [{ publicId, resourceType }] — skips non-Cloudinary URLs
 * (e.g. legacy Firebase Storage links), which must not be deleted here.
 */
function extractCloudinaryAssets(media = []) {
    const assets = [];
    const list = Array.isArray(media) ? media : media ? [media] : [];

    for (const item of list) {
        const url = typeof item === "string" ? item : item?.url;
        const declaredType =
            typeof item === "object" && item?.kind === "video" ? "video" : "image";

        if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
            continue; // legacy Firebase Storage URL or foreign host — never touch
        }

        // .../video/upload/v123/bayan/media/video/abc123.mp4
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        const publicId = match?.[1];
        const resourceType = url.includes("/video/upload/") ? "video" : declaredType;

        if (publicId) {
            assets.push({ publicId: publicId.replace(/\.[a-zA-Z0-9]+$/, ""), resourceType });
        }
    }

    return assets;
}

/**
 * Deletes Cloudinary assets ONLY if no other live record references them.
 * @param {{ media: Array, excludePostId: string }} params
 * @returns {{ deleted: string[], failed: Array, skipped: number }}
 */
async function deleteCloudinaryAssetsIfUnused({ media = [], excludePostId }) {
    const assets = extractCloudinaryAssets(media);
    if (!assets.length) return { deleted: [], failed: [], skipped: 0 };

    // Scan ALL posts for reuse of the same public_id in another record.
    let allPosts = [];
    try {
        const snapshot = await get(ref(db, "posts"));
        allPosts = snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (err) {
        console.error("deleteCloudinaryAssetsIfUnused scan error:", err.message);
        // Fail safe: don't delete if we can't verify uniqueness.
        return { deleted: [], failed: assets.map((a) => ({ ...a, reason: "scan-failed" })), skipped: 0 };
    }

    const othersMedia = [];
    for (const post of allPosts) {
        if (String(post.id) === String(excludePostId)) continue;
        othersMedia.push(...(Array.isArray(post.media) ? post.media : []));
        othersMedia.push(...(Array.isArray(post.img) ? post.img : []));
    }

    const results = { deleted: [], failed: [], skipped: 0 };

    for (const asset of assets) {
        const reused = othersMedia.some((m) => {
            const url = typeof m === "string" ? m : m?.url;
            return typeof url === "string" && url.includes(asset.publicId);
        });

        if (reused) {
            results.skipped += 1;
            continue;
        }

        try {
            await cloudinary.uploader.destroy(asset.publicId, {
                resource_type: asset.resourceType,
                invalidate: true,
            });
            results.deleted.push(asset.publicId);
        } catch (err) {
            console.error(`Cloudinary delete failed for ${asset.publicId}:`, err.message);
            // Logged for retry — DB already updated; cleanup is retriable.
            results.failed.push({ ...asset, reason: err.message });
        }
    }

    return results;
}

module.exports = {
    MEDIA_LIMITS,
    isConfigured,
    buildSignedUpload,
    validateMediaManifest,
    extractCloudinaryAssets,
    deleteCloudinaryAssetsIfUnused,
};
