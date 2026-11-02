import {api} from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * Comment service — single authoritative comment data layer.
 *
 * Write path  : REST  POST /savePosts  (existing backend endpoint; comments
 *               are persisted as content records carrying `comment_on`,
 *               matching the existing Firebase schema).
 * Read path   : Socket.IO `GET_FEED` → `FEED_RESULT` filtered on `comment_on`,
 *               reusing the existing shared socket connection.
 * Realtime    : Socket.IO `NEW_POST` events filtered on `comment_on`.
 *
 * No duplicate HTTP/SDK write paths are introduced.
 */

export const COMMENT_EVENTS = {
  GET_FEED: "GET_FEED",
  FEED_RESULT: "FEED_RESULT",
  NEW_POST: "NEW_POST",
};

/** Hard limits (frontend mirror of server-side validation). */
export const COMMENT_MAX_LENGTH = 1000;

/** Content types supported by the existing backend schema. */
export const COMMENT_CONTENT_TYPES = {
  POST: "posts",
  ARTICLE: "articles",
  NOVEL: "novels",
};

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

/**
 * Normalizes a raw backend comment record into a predictable shape.
 * Kept defensive because feed records vary in ID/author field naming.
 */
export const normalizeComment = (raw, index = 0) => {
  if (!raw || typeof raw !== "object") return null;

  const id = normalizeId(raw.id ?? raw._id ?? raw.id_post ?? raw.postId ?? raw.idPost);
  if (!id) return null;

  return {
    id,
    commentOn: normalizeId(raw.comment_on ?? raw.commentOn ?? raw.commentOnId),
    parentType: raw.parentType || raw.type || COMMENT_CONTENT_TYPES.POST,
    text: typeof raw.content === "string" ? raw.content : "",
    images: Array.isArray(raw.img) ? raw.img : [],
    media: Array.isArray(raw.media) ? raw.media : [],
    type: raw.type || COMMENT_CONTENT_TYPES.POST,
    date: raw.date || null,
    time: raw.time || null,
    createdAt: raw.createdAt || raw.timestamp || null,
    likesCount: Number(raw.likesCount ?? raw.likes ?? 0),
    replyCount: Number(raw.replyCount ?? 0),
    likesBy: raw.likesBy || null,
    author: {
      id: normalizeId(raw.autherID ?? raw.authorId ?? raw.userId ?? raw.userData?.Id_user),
      name: raw.userData?.F_user || raw.F_user || "",
      username: raw.userData?.S_user || raw.S_user || "",
      imgProfile: raw.userData?.imgProfile || raw.imgProfile || "",
    },
    _raw: raw,
    _key: `${id}-${index}`,
  };
};

/**
 * Fetches existing replies/comments for a content item.
 *
 * Primary path: REST POST /getReplies — targeted per-parent read maintained
 * by the backend's replyIndex; falls back gracefully when unavailable.
 *
 * @param {{ contentId: string, contentType?: string }} params
 * @returns {Promise<{ comments: Array, error: string|null }>}
 */
export const fetchComments = async ({ contentId } = {}) => {
  if (!contentId) return { comments: [], error: null };

  try {
    const response = await api.post(API_ENDPOINTS.GET_REPLIES, {
      parentId: String(contentId),
    });

    const body = response?.data;
    if (body?.status !== "ok") {
      return { comments: [], error: body?.message || "Failed to load replies" };
    }

    const rawItems = Array.isArray(body.replies) ? body.replies : [];
    const seen = new Set();
    const comments = [];

    rawItems.forEach((item, index) => {
      const comment = normalizeComment(item, index);
      if (comment && !seen.has(comment.id)) {
        seen.add(comment.id);
        comments.push(comment);
      }
    });

    return { comments, error: null };
  } catch (err) {
    return {
      comments: [],
      error:
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load replies",
    };
  }
};

/**
 * Submits a comment through the existing REST endpoint used by the writer.
 * The backend derives identity from the Authorization token — the frontend
 * only supplies the display payload; `userId` is informational.
 *
 * @param {{ contentId: string, contentType?: string, userId?: string, text: string, images?: string[] }} params
 * @returns {Promise<{ ok: boolean, comment?: object, error?: string }>}
 */
export const submitComment = async ({userData, contentId, contentType = COMMENT_CONTENT_TYPES.POST, userId, text, images = [], media = [] }) => {
  const trimmed = (text || "").trim();

  if (!contentId) return { ok: false, error: "Missing content reference" };
  if (!trimmed) return { ok: false, error: "Please write a comment" };
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `Comment is too long (max ${COMMENT_MAX_LENGTH} characters)` };
  }
 
  const id = String(Date.now()) + String(Math.floor(100 + Math.random() * 900));
 
  try {
      const payload = {
        autherID: userId,
        id,
        comment_on: contentId,
        img: images,
        media,
        content: trimmed,
        type: contentType,
        userData: userData
          ? {
            Id_user: userData.id,
            F_user: userData.name || userData.F_user,
            S_user: userData.username || userData.S_user,
            imgProfile: userData.imgProfile,
          }
          : undefined,
        date: new Date().toLocaleDateString("en-CA"),
      };

    const response = await api.post(API_ENDPOINTS.SAVE_POSTS, payload);

    // Only treat the comment as persisted when the backend actually
    // acknowledged success (2xx with `status: "ok"`).
    const body = response?.data;
    const backendOk =
      response.status >= 200 &&
      response.status < 300 &&
      (body?.status === undefined || body.status === "ok");

    if (!backendOk) {
      return {
        ok: false,
        error:
          body?.message ||
          "The comment could not be saved. Please try again.",
      };
    }

    return {
      ok: true,
      comment: normalizeComment(payload),
    };
  } catch (err) {
  console.error("submitComment failed:", {
    message: err.message,
    url: err.config?.baseURL
      ? `${err.config.baseURL}${err.config.url}`
      : err.config?.url,
    status: err.response?.status,
    response: err.response?.data,

  });

  const status = err.response?.status;

  const error =
    status === 401
      ? "Your session has expired. Please sign in again."
      : err.response?.data?.message ||
        err.message ||
        "Failed to post comment. Please try again.";

  return { ok: false, error };
}
};

export default { fetchComments, submitComment, normalizeComment, COMMENT_MAX_LENGTH };
