import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * View counter — تسجيل مشاهدة عبر الخادم.
 * الخادم يقرر إن كانت المشاهدة جديدة أو مكررة، ويعيد العدد الفعلي.
 *
 * Performance: on the feed page many cards mount at once — firing one POST
 * per card floods the network at load. Views are queued and flushed in ONE
 * batched request ~2s later (idle time), and deduped per session so a card
 * that already reported this visit never re-posts.
 */
const FLUSH_DELAY_MS = 2000;
const pendingViews = new Map(); // key: "type:id" -> contentId
let flushTimer = null;
const flushedThisSession = new Set();

const flushViews = async () => {
  flushTimer = null;
  if (!pendingViews.size) return;
  const batch = Array.from(pendingViews.values());
  pendingViews.clear();
  try {
    await api.post(API_ENDPOINTS.VIEW, { batch });
  } catch (e) {
    /* server count authoritative — a failed batch view is simply not counted */
  }
};

export const registerView = async ({ contentId, contentType }) => {
  const key = `${contentType}:${contentId}`;
  if (flushedThisSession.has(key)) return { ok: true, counted: false };
  flushedThisSession.add(key);
  pendingViews.set(key, { contentId, contentType });
  if (!flushTimer) flushTimer = setTimeout(flushViews, FLUSH_DELAY_MS);
  return { ok: true, counted: true, deferred: true };
};
