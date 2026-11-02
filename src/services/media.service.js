import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * Cloudinary media service (client side).
 *
 * Upload flow (safe signed upload):
 *  1. Client asks the BACKEND for a short-lived signature (`/media/upload-signature`)
 *     after authenticated (Bearer token) — the API secret never reaches the client
 *     and the client cannot alter signed params.
 *  2. Client uploads the file DIRECTLY to Cloudinary with those signed params.
 *  3. Client returns `{ kind, url, publicId, duration, width, height, bytes }`
 *     to include in the post/reply payload; the SERVER re-validates limits.
 *
 * No Firebase Storage is used anywhere here.
 */

export const MEDIA_LIMITS_FALLBACK = {
  MAX_IMAGES: 4,
  MAX_VIDEO_SECONDS: 30,
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,  // 10 MB
  MAX_VIDEO_BYTES: 50 * 1024 * 1024,  // 50 MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
};

let serverLimits = null;

const getLimits = async () => {
  if (serverLimits) return serverLimits;
  try {
    const res = await api.post(API_ENDPOINTS.MEDIA_UPLOAD_SIGNATURE, { kind: "image" });
    if (res?.data?.limits) {
      serverLimits = res.data.limits;
      return serverLimits;
    }
  } catch {
    /* fall through to fallback limits */
  }
  return MEDIA_LIMITS_FALLBACK;
};

/** Reads the REAL duration of a video file via a media element (not the extension). */
export const probeVideoDuration = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : 0);
    video.onerror = () => done(0);
    video.src = url;
  });

/** Reads the REAL dimensions of an image file. */
export const probeImage = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done({ width: 0, height: 0 });
    img.src = url;
  });

/**
 * Validates a media file BEFORE upload (client-side pre-check only —
 * the server re-validates the manifest at persistence time).
 * @returns {Promise<{ ok: boolean, error?: string, duration?: number }>}
 */
export const validateMediaFile = async (file) => {
  const limits = await getLimits();
  const type = file?.type || "";
  const isImage = limits.ALLOWED_IMAGE_TYPES.includes(type);
  const isVideo = limits.ALLOWED_VIDEO_TYPES.includes(type);

  if (!isImage && !isVideo) {
    return { ok: false, error: "نوع الملف غير مدعوم (الصور: JPG/PNG/WebP/GIF — الفيديو: MP4/WebM/MOV)" };
  }

  if (isImage && file.size > limits.MAX_IMAGE_BYTES) {
    return { ok: false, error: `حجم الصورة يتجاوز الحد الأقصى (${Math.round(limits.MAX_IMAGE_BYTES / 1024 / 1024)} MB)` };
  }

  if (isVideo) {
    if (file.size > limits.MAX_VIDEO_BYTES) {
      return { ok: false, error: `حجم الفيديو يتجاوز الحد الأقصى (${Math.round(limits.MAX_VIDEO_BYTES / 1024 / 1024)} MB)` };
    }
    const duration = await probeVideoDuration(file);
    if (duration >= limits.MAX_VIDEO_SECONDS) {
      return { ok: false, error: "مدة الفيديو يجب أن تكون أقل من 30 ثانية" };
    }
    return { ok: true, duration };
  }

  return { ok: true };
};

/**
 * Requests a signed upload payload from the backend.
 */
export const getUploadSignature = async (kind) => {
  const res = await api.post(API_ENDPOINTS.MEDIA_UPLOAD_SIGNATURE, { kind });
  const body = res?.data;

  if (body?.status !== "ok" || !body?.upload) {
    throw new Error(body?.message || "Failed to authorize media upload");
  }
  return body.upload;
};

/**
 * Uploads one file to Cloudinary directly, using the server-signed params.
 * @returns {Promise<{kind,url,publicId,duration,width,height,bytes}>}
 */
export const uploadMediaFile = async (file) => {
  const type = file?.type || "";
  const isVideo = (serverLimits?.ALLOWED_VIDEO_TYPES || MEDIA_LIMITS_FALLBACK.ALLOWED_VIDEO_TYPES).includes(type);
  const kind = isVideo ? "video" : "image";

  const check = await validateMediaFile(file);
  if (!check.ok) throw new Error(check.error);

  const sig = await getUploadSignature(kind);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", sig.timestamp);
  formData.append("folder", sig.folder);
  formData.append("upload_preset", sig.uploadPreset);
  formData.append("signature", sig.signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(result?.error?.message || "فشل رفع الوسائط إلى Cloudinary");
  }

  return {
    kind,
    url: result.secure_url,
    publicId: result.public_id,
    duration: isVideo ? Number(result.duration ?? check.duration ?? 0) : undefined,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
};

/**
 * Uploads a batch (mixed images/video) honoring the media limits.
 * Enforces MAX_IMAGES and single-video rules before any network call.
 */
export const uploadMediaBatch = async (files) => {
  const limits = await getLimits();
  const list = Array.from(files || []);

  const imageFiles = list.filter((f) => limits.ALLOWED_IMAGE_TYPES.includes(f.type));
  const videoFiles = list.filter((f) => limits.ALLOWED_VIDEO_TYPES.includes(f.type));

  if (imageFiles.length > limits.MAX_IMAGES) {
    throw new Error(`الحد الأقصى ${limits.MAX_IMAGES} صور لكل منشور`);
  }
  if (videoFiles.length > 1) {
    throw new Error("فيديو واحد فقط لكل منشور أو رد");
  }

  const uploaded = [];
  for (const file of list) {
    uploaded.push(await uploadMediaFile(file));
  }
  return uploaded;
};

/**
 * Best-effort cleanup of orphaned Cloudinary uploads (post-save failure).
 * Uses the server's `/media/upload-signature`-style authenticated endpoint
 * (`/media/discard`) so the API secret never leaves the backend.
 * Fire-and-forget: failures are logged, never thrown — retrying publish
 * must not be blocked by a failed cleanup.
 */
export const discardUploadedMedia = async (uploaded = []) => {
  const ids = (Array.isArray(uploaded) ? uploaded : [])
    .filter((m) => m?.publicId && m?.url && String(m.url).includes("res.cloudinary.com"))
    .map((m) => ({ publicId: m.publicId, resourceType: m.kind === "video" ? "video" : "image" }));
  if (!ids.length) return;
  try {
    await api.post(API_ENDPOINTS.MEDIA_DISCARD, { assets: ids });
  } catch (err) {
    console.warn("Orphaned media cleanup failed:", err?.response?.data?.message || err?.message);
  }
};

/** Cloudinary feed-optimized image URL (transform-on-delivery, no storage change). */
export const cloudinaryFeedUrl = (url, width = 640) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
};

/** Full-quality URL (original) for detail views. */
export const cloudinaryFullUrl = (url) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};
