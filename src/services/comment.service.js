import api from "./api.service";
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

const isCommentFor = (item, contentId) =>
  Boolean(item) && typeof item === "object" && normalizeId(item.comment_on) === normalizeId(contentId);

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
    text: typeof raw.content === "string" ? raw.content : "",
    images: Array.isArray(raw.img) ? raw.img : [],
    type: raw.type || COMMENT_CONTENT_TYPES.POST,
    date: raw.date || null,
    createdAt: raw.createdAt || raw.timestamp || null,
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
 * Fetches existing comments for a content item.
 *
 * Uses the existing socket connection and emits GET_FEED; the resolver
 * filters FEED_RESULT records whose `comment_on` matches the target content.
 * Resolves with an array of normalized comments (never rejects).
 *
 * @param {import("socket.io-client").Socket|null} socket
 * @param {{ contentId: string, contentType?: string, timeoutMs?: number }} params
 * @returns {Promise<{ comments: Array, error: string|null }>}
 */
export const fetchComments = (socket, { contentId, timeoutMs = 8000 } = {}) =>
  new Promise((resolve) => {
    if (!socket || !contentId) {
      resolve({ comments: [], error: null });
      return;
    }

    let settled = false;
    const comments = [];
    const seen = new Set();

    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off(COMMENT_EVENTS.FEED_RESULT, handleResult);
      resolve({ comments, error });
    };

    const handleResult = (res) => {
      const rawItems = Array.isArray(res)
        ? res
        : res?.items || res?.posts || res?.content || res?.data || res?.result || res?.feed || [];

      rawItems
        .filter((item) => isCommentFor(item, contentId))
        .forEach((item, index) => {
          const comment = normalizeComment(item, index);
          if (comment && !seen.has(comment.id)) {
            seen.add(comment.id);
            comments.push(comment);
          }
        });
    };

    const timer = setTimeout(() => finish(), timeoutMs);

    socket.on(COMMENT_EVENTS.FEED_RESULT, handleResult);

    try {
      socket.emit(COMMENT_EVENTS.GET_FEED, {
        userId: "",
        type: "all",
        cursor: 0,
        limit: 100,
      });
    } catch (err) {
      finish(err?.message || "Failed to load comments");
    }
  });

/**
 * Submits a comment through the existing REST endpoint used by the writer.
 * The backend derives identity from the Authorization token — the frontend
 * only supplies the display payload; `userId` is informational.
 *
 * @param {{ contentId: string, contentType?: string, userId?: string, text: string, images?: string[] }} params
 * @returns {Promise<{ ok: boolean, comment?: object, error?: string }>}
 */
export const submitComment = async ({userData, contentId, contentType = COMMENT_CONTENT_TYPES.POST, userId, text, images = [] }) => {
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
        content:trimmed,
        type:contentType,
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

    await api.post(API_ENDPOINTS.SAVE_POSTS, payload);

    return {
      ok: true,
      comment: normalizeComment(payload),
    };
  } catch (err) {
    const status = err?.response?.status;
    const error =
      status === 401
        ? "Your session has expired. Please sign in again."
        : err?.response?.data?.message || err?.message || "Failed to post comment. Please try again.";
    return { ok: false, error };
  }
};

export default { fetchComments, submitComment, normalizeComment, COMMENT_MAX_LENGTH };
