import { FEED_BATCH_SIZE } from "../../../constants/feedConfig";

// Unified profile-content request/response over the existing socket contract.
// The server returns: { items, nextCursor, counts, error? }

export const PROFILE_TABS = [
  { key: "all" },
  { key: "posts" },
  { key: "replies" },
  { key: "articles" },
  { key: "novels" },
];

export const requestProfileContent = (socket, { userId, type = "all", cursor = 0, limit = FEED_BATCH_SIZE }) => {
  if (!socket) return;
  socket.emit("MYCONTENT", { idUser: userId, type, cursor, limit });
};

/**
 * Client-side normalization layer. Field names differ between sources
 * (posts vs articles vs novels), so they are reconciled once here.
 * Author identity ALWAYS comes from the item's own author fields —
 * never from the parent post's author.
 */
export const normalizeProfileItem = (raw, index = 0) => {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id ?? raw._id ?? raw.id_post ?? `profile-item-${index}`);
  const authorId = String(raw.autherID ?? raw.userData?.Id_user ?? raw.Id_user ?? "");

  const kind =
    raw.kind ||
    (raw.comment_on ? "reply" : String(raw.type || "").toLowerCase().includes("article") ? "article"
      : String(raw.type || "").toLowerCase().includes("novel") ? "novel" : "post");

  // Original creation timestamp (never the edit date). Items without any
  // date sort last without breaking anything.
  let timestamp = Number(raw.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    const parsed = raw.date ? new Date(`${raw.date} ${raw.time || ""}`.trim()).getTime() : NaN;
    timestamp = Number.isFinite(parsed) ? parsed : 0;
  }

  return {
    id,
    kind,
    autherID: authorId,
    userData: raw.userData || null,
    content: raw.content || "",
    title: raw.title || "",
    descrip: raw.descrip || raw.description || "",
    series: raw.series || null,
    media: Array.isArray(raw.media) ? raw.media : undefined,
    img: Array.isArray(raw.img) ? raw.img : [],
    comment_on: raw.comment_on || null,
    parentType: raw.parentType || null,
    parentUserData: raw.parentUserData || null,
    likesCount: Number(raw.likesCount ?? raw.likes ?? 0) || 0,
    replyCount: Number(raw.replyCount ?? raw.commentsCount ?? 0) || 0,
    timestamp,
    date: raw.date || "",
    time: raw.time || "",
  };
};

/** Extract the items array from any backend payload shape. */
export const extractProfileItems = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;           // legacy array payload
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.content)) return res.content;
  return [];
};

export const extractNextCursor = (res) => {
  if (Array.isArray(res)) return null;          // legacy: single shot
  return res?.nextCursor ?? null;
};

export const extractCounts = (res) => {
  const raw = Array.isArray(res) ? null : res?.counts || null;
  if (!raw) return null;
  // Server emits SINGULAR kind keys (post/reply/article/novel); tabs are
  // PLURAL. Map them so ProfileTabs badges receive { posts, replies, ... }.
  const map = { post: "posts", reply: "replies", article: "articles", novel: "novels" };
  const counts = {};
  for (const [key, value] of Object.entries(raw)) counts[map[key] || key] = value;
  return counts;
};
