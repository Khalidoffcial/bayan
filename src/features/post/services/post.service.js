import { api } from "../../../services/api.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";

export const sharePost = async ({ title, text, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || "Post",
        text: text || "",
        url: url || window.location.href,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  }
};

/**
 * Fetches a single post (or first-class reply) by ID from the backend.
 * Used when a reply is opened directly via /rp/:postId deep link and no
 * navigation `state` is available.
 *
 * @param {string} postId
 * @returns {Promise<{ post: object|null, error: string|null }>}
 */
export const fetchPostById = async (postId) => {
  if (!postId) return { post: null, error: "Missing post id" };

  try {
    const response = await api.post(API_ENDPOINTS.GET_POST_BY_ID, { postId });
    const body = response?.data;

    if (body?.status !== "ok" || !body?.post) {
      return { post: null, error: body?.message || "Post not found" };
    }

    return { post: body.post, error: null };
  } catch (err) {
    return {
      post: null,
      error:
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load post. Please try again.",
    };
  }
};

/**
 * Edits a post — ownership is verified server-side from the Bearer token.
 * @param {{ postId: string, content?: string, media?: Array, removedMedia?: Array }} params
 */
export const editPost = async ({ postId, content, media, removedMedia }) => {
  try {
    const response = await api.post(API_ENDPOINTS.EDIT_POST, {
      postId,
      content,
      media,
      removedMedia,
    });
    const body = response?.data;

    if (body?.status !== "ok") {
      return { ok: false, error: body?.message || "Failed to edit post" };
    }
    return { ok: true, post: body.post, cleanup: body.cleanup };
  } catch (err) {
    return {
      ok: false,
      error:
        err?.response?.data?.message ||
        err?.message ||
        "Failed to edit post",
    };
  }
};

/**
 * Deletes a post — ownership verified server-side; Cloudinary cleanup
 * happens after the DB record removal and skips reused assets.
 */
export const deletePost = async (postId) => {
  try {
    const response = await api.post(API_ENDPOINTS.DELETE_POST, { postId });
    const body = response?.data;

    if (body?.status !== "ok") {
      return { ok: false, error: body?.message || "Failed to delete post" };
    }
    return { ok: true, cleanup: body.cleanup };
  } catch (err) {
    return {
      ok: false,
      error:
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete post",
    };
  }
};
