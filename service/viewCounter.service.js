/**
 * View Counter Service — عداد مشاهدات حقيقي بآلية ذرية.
 * =====================================================
 * المبادئ:
 *  - الزيادة تتم في Backend فقط — الواجهة لا تزيدها أبدًا.
 *  - Firebase Transaction يمنع فقدان الزيادات المتزامنة.
 *  - منع التكرار: مشاهدة واحدة لكل هوية لكل محتوى خلال WINDOW_MS.
 *    الهوية = userId موثق للمسجلين، و IP-hash للزوار (بلا بيانات شخصية).
 *  - لا يُحسب المشهد إلا إذا كان المحتوى موجودًا (منشورًا).
 *  - لا تصفير ولا تعديل للعداد من الواجهة.
 */

const dao = require("../datastore/Dao.js");

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 ساعة — قابلة للضبط عبر env
const VIEW_WINDOW_MS_EFFECTIVE = Number(process.env.VIEW_WINDOW_MS) || VIEW_WINDOW_MS;

// سجل التكرار في الذاكرة (LRU بسيط) — يُفرَّغ عند الإقلاع
const seen = new Map(); // `${contentId}:${viewerId}` → timestamp
const SEEN_MAX = 20000;

// Rate limiting: عدد تسجيلات المشاهدة لكل هوية
const rateMap = new Map();
const MAX_VIEW_REGISTRATIONS = 120;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * هوية المشاهد — من التوكن للمسجل، ومن IP hashed للزائر.
 * الواجهة لا تختار الهوية أبدًا.
 */
function resolveViewerId(req) {
  if (req.user?.id) return `u:${req.user.id}`;
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return `ip:${hashString(ip)}`;
}

function checkRate(viewerId) {
  const now = Date.now();
  const entry = rateMap.get(viewerId) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (entry.timestamps.length >= MAX_VIEW_REGISTRATIONS) {
    return false;
  }
  entry.timestamps.push(now);
  rateMap.set(viewerId, entry);
  return true;
}

/**
 * تسجيل مشاهدة.
 * @returns {object} { ok, views, counted } — counted=false إذا كانت مكررة
 */
async function registerView({ contentId, contentType, viewerId }) {
  // 1. التحقق من وجود المحتوى فعليًا — لا عداد لمحتوى محذوف
  let record = null;
  switch (contentType) {
    case "posts":
      record = await dao.getPostID(String(contentId));
      break;
    case "articles":
      record = await dao.getArticleID(String(contentId));
      break;
    case "novels":
      record = await dao.getnovelsID(String(contentId));
      break;
    default:
      record = null;
  }
  if (!record) {
    return { ok: false, error: "CONTENT_NOT_FOUND" };
  }

  const seenKey = `${contentType}:${contentId}:${viewerId}`;
  const now = Date.now();
  const lastSeen = seen.get(seenKey);

  // 2. منع التكرار داخل النافذة الزمنية
  if (lastSeen && now - lastSeen < VIEW_WINDOW_MS_EFFECTIVE) {
    return { ok: true, views: record.views || 0, counted: false };
  }

  // 3. زيادة ذرية عبر Firebase Transaction
  const path =
    contentType === "posts"
      ? `posts/posts${contentId}`
      : contentType === "articles"
        ? `articles/articles${contentId}`
        : `novels/novels${contentId}`;

  const newViews = await dao.incrementViewsTransaction(path);
  if (newViews === null) {
    return { ok: false, error: "INCREMENT_FAILED" };
  }

  // 4. تسجيل المشاهدة في السجل المحلي
  if (seen.size >= SEEN_MAX) {
    const oldest = seen.keys().next().value;
    seen.delete(oldest);
  }
  seen.set(seenKey, now);

  return { ok: true, views: newViews, counted: true };
}

module.exports = {
  registerView,
  resolveViewerId,
  checkRate,
  VIEW_WINDOW_MS_EFFECTIVE,
};
