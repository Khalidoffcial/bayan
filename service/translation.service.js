/**
 * Translation Service — خدمة ترجمة المحتوى المنشور.
 * =====================================================
 * المبادئ:
 *  - لا تُترجم إلا عند طلب المستخدم (on-demand).
 *  - لا تُخزن الترجمة كمصدر للمحتوى — تُخزن فقط في كاش مؤقت مرتبط بـ
 *    (contentId, sourceLang, targetLang, contentVersion).
 *  - غير مرتبطة بمزود واحد: TranslationProvider واجهة، والتبديل بين
 *    المزودين يحدث في PROVIDERS دون تعديل الأكواد المستدعية.
 *  - حدود حجم ونِسَب استخدام صارمة لمنع الإساءة.
 *
 * المزود الحالي: google-translate-api (unofficial) — مجاني، لكنه:
 *  - غير رسمي (لا SLA، قد يُحجب، يعمل عبر endpoints غير موثقة).
 *  - لا يحتاج مفتاح API ولا تكلفة صريحة.
 * للاستخدام الإنتاجي الطويل الأمد يُنصح بـ: DeepL / Google Cloud Translation
 * (بمفتاح API في backend .env فقط، لا في الواجهة).
 */

const { translate } = require("@vitalets/google-translate-api");

// ======================================================
// إعدادات الحماية والحدود
// ======================================================

const MAX_TEXT_LENGTH = 5000;          // أقصى حجم نص مطلوب للترجمة
const MAX_TEXT_LENGTH_ARTICLE = 12000; // حد أوسع للمقالات والروايات
const MAX_BATCH_SEGMENTS = 20;         // أقصى عدد مقاطع في طلب واحد
const MAX_REQUESTS_PER_USER = 60;      // أقصى طلبات ترجمة لكل مستخدم
const RATE_WINDOW_MS = 10 * 60 * 1000; // نافذة الـ rate limit (10 دقائق)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // مدة بقاء الترجمة في الكاش (24 ساعة)
const CACHE_MAX_ENTRIES = 1000;        // أقصى عدد مدخلات في الكاش
const PROVIDER_TIMEOUT_MS = 15000;     // مهلة كل استدعاء للمزود

const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "de", "pt", "tr", "zh", "ja", "ru"];

// خريطة من لغات Bayan إلى رموز المزود
const PROVIDER_LANG_MAP = {
  en: "en", ar: "ar", fr: "fr", es: "es", de: "de",
  pt: "pt", tr: "tr", zh: "zh-CN", ja: "ja", ru: "ru",
};

// ======================================================
// طبقة المزود (Provider abstraction)
// ======================================================

/**
 * TranslationProvider — العقد الذي يُطبقه أي مزود.
 *   translateBatch(texts, targetLang) → { texts: [...], sourceLang }
 */
/**
 * Timeout wrapper — يمنع تعليق الطلب إذا لم يرد المزود.
 * الخطأ يميّز بوضوح: TIMEOUT ≠ فشل المزود.
 */
function withTimeout(promise, ms, label = "provider") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error(`${label} timed out after ${ms}ms`), { code: "TIMEOUT" })), ms)
    ),
  ]);
}

const PROVIDERS = {
  google: {
    name: "google-translate-api (unofficial, free, no API key)",
    async translateBatch(texts, targetLang) {
      const out = [];
      for (const text of texts) {
        const result = await withTimeout(
          translate(text, { to: PROVIDER_LANG_MAP[targetLang] || "en" }),
          PROVIDER_TIMEOUT_MS
        );
        if (!result || typeof result.text !== "string") {
          throw Object.assign(new Error("Invalid provider response"), { code: "INVALID_RESPONSE" });
        }
        out.push(result.text);
      }
      return out;
    },
    async detectLanguage(text) {
      const result = await withTimeout(translate(text, { to: "en" }), PROVIDER_TIMEOUT_MS);
      return result?.from?.language?.iso || null;
    },
  },
};

// المزود النشط — يُتغيّر في مكان واحد فقط
let activeProvider = PROVIDERS.google;
let providerAvailable = true; // يُحدد من فحص التهيئة

function setProvider(name) {
  if (!PROVIDERS[name]) throw new Error(`Unknown provider: ${name}`);
  activeProvider = PROVIDERS[name];
}

function getProviderInfo() {
  return {
    name: activeProvider.name,
    available: providerAvailable,
    maxTextLength: MAX_TEXT_LENGTH,
    maxTextLengthArticle: MAX_TEXT_LENGTH_ARTICLE,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

// فحص عند الإقلاع — لا نُثبت أن الخدمة تعمل حتى نجرّبها فعليًا
(async () => {
  try {
    await activeProvider.translateBatch(["ok"], "en");
    providerAvailable = true;
    console.log("🌐 Translation provider ready:", activeProvider.name);
  } catch (err) {
    providerAvailable = false;
    console.error("🌐 Translation provider NOT available:", err.message);
  }
})();

// ======================================================
// Cache — مرتبط بـ (contentId, sourceLang, targetLang, contentVersion)
// ======================================================

// LRU بسيط في الذاكرة — يُفرَّغ عند الإقلاع.
// نتيجة الترجمة لا تُخزن في قاعدة المحتوى الأصلية إطلاقًا.
const cache = new Map(); // key → { translated, sourceLang, createdAt, expiresAt }

const cacheKey = (contentId, sourceLang, targetLang, contentVersion) =>
  `${contentId}:${sourceLang}:${targetLang}:${contentVersion || 0}`;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // تحديث ترتيب LRU
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, {
    ...value,
    createdAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ======================================================
// Rate limiting — منع إساءة استخدام خدمة الترجمة
// ======================================================

const rateMap = new Map(); // userId → { timestamps: [...] }

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateMap.get(userId) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (entry.timestamps.length >= MAX_REQUESTS_PER_USER) {
    return { ok: false, retryAfterMs: RATE_WINDOW_MS - (now - entry.timestamps[0]) };
  }
  entry.timestamps.push(now);
  rateMap.set(userId, entry);
  return { ok: true };
}

// ======================================================
// النص → مقاطع قابلة للترجمة (محافظًا على الروابط والتنسيق)
// ======================================================

/**
 * تقسيم HTML إلى مقاطع نصية قابلة للترجمة، مع الحفاظ على الوسوم
 * (الروابط، العناوين، الفواصل) دون ترجمتها.
 * كل وسم بنيوي يُحفظ كمَسْنَن، والنص الداخلي هو ما يُترجم فقط.
 */
const STRUCTURAL_TAG = /(<\/?(?:p|div|br|h[1-6]|li|ul|ol|blockquote|hr|figure|figcaption|img|a|strong|em|b|i|span)\b[^>]*>)/gi;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

function splitHtmlIntoSegments(html) {
  if (!html) return { segments: [], skeleton: (t) => t };
  // استبدل الروابط بعلامات مؤقتة حتى لا تُترجم
  const urlMap = [];
  let htmlNoUrls = html.replace(URL_PATTERN, (m) => {
    urlMap.push(m);
    return ` [[URL_${urlMap.length - 1}]] `;
  });

  // فصل الوسوم البنيوية عن النص
  const parts = htmlNoUrls.split(STRUCTURAL_TAG).filter((p) => p !== "");
  const segments = [];   // النصوص القابلة للترجمة
  const skeleton = [];   // خريطة: { type: "tag" | "text", value }

  for (const part of parts) {
    if (part.startsWith("<")) {
      skeleton.push({ type: "tag", value: part });
    } else {
      const trimmed = part.trim();
      if (trimmed) {
        segments.push(trimmed);
        skeleton.push({ type: "text", value: trimmed });
      } else {
        skeleton.push({ type: "text", value: "" });
      }
    }
  }

  return {
    segments,
    skeleton,
    reassemble: (translatedSegments) => {
      let i = 0;
      let out = skeleton
        .map((part) => {
          if (part.type === "tag") return part.value;
          if (part.type === "text" && part.value === "") return "";
          return translatedSegments[i++] ?? part.value;
        })
        .join("");
      // استرجاع الروابط
      out = out.replace(/\[\[URL_(\d+)\]\]/g, (_, idx) => urlMap[Number(idx)] || "");
      return out;
    },
  };
}

// ======================================================
// دالة الترجمة الرئيسية
// ======================================================

/**
 * translateContent — يُترجم محتوى منشور عند طلب المستخدم.
 * @param {object} options
 * @param {string} options.contentId   — معرف المحتوى (للتخزين المؤقت)
 * @param {string} options.content     — HTML أو نص منشور المستخدم (الأصل، لا يُغيّر)
 * @param {string} options.contentVersion — إصدار المحتوى (updatedAt أو hash)
 * @param {string} options.targetLang  — لغة الواجهة الحالية
 * @param {string} options.userId      — للـ rate limit
 * @param {boolean} options.isLong     — مقال أو رواية (حد أوسع)
 * @returns {object} { ok, translatedText, sourceLang, cached } | { ok:false, error }
 */
async function translateContent({
  contentId,
  content,
  contentVersion,
  targetLang,
  userId,
  isLong = false,
}) {
  if (!contentId || !content || !targetLang || !SUPPORTED_LANGUAGES.includes(targetLang)) {
    return { ok: false, error: "MISSING_PARAMS", message: "Missing or invalid translation parameters" };
  }
  if (!providerAvailable) {
    return { ok: false, error: "PROVIDER_UNAVAILABLE", message: "Translation provider is not available" };
  }

  const maxLength = isLong ? MAX_TEXT_LENGTH_ARTICLE : MAX_TEXT_LENGTH;
  if (content.length > maxLength) {
    return { ok: false, error: "TOO_LONG", message: `Content exceeds the maximum of ${maxLength} characters` };
  }

  // Rate limit
  const rate = checkRateLimit(userId);
  if (!rate.ok) {
    return { ok: false, error: "RATE_LIMITED", message: "Too many translation requests", retryAfterMs: rate.retryAfterMs };
  }

  // تقسيم المحتوى
  const { segments, reassemble } = splitHtmlIntoSegments(content);
  if (segments.length === 0) return { ok: false, error: "EMPTY", message: "No translatable content" };
  if (segments.length > MAX_BATCH_SEGMENTS * 4) {
    return { ok: false, error: "TOO_LONG", message: "Too many segments to translate" };
  }

  // اكتشاف اللغة المصدر — نجرب حتى 3 مقاطع (المقطع الأول قد يكون رقمًا أو رابطًا أو قصيرًا جدًا)
  let sourceLang = null;
  let detectErr = null;
  const probeSegments = segments.slice(0, 3);
  for (const seg of probeSegments) {
    try {
      const detected = await activeProvider.detectLanguage(seg);
      if (detected) { sourceLang = detected; break; }
    } catch (err) {
      detectErr = err;
    }
  }
  if (!sourceLang) {
    if (detectErr?.code === "TIMEOUT") {
      return { ok: false, error: "TIMEOUT", message: "Translation provider timed out" };
    }
    return { ok: false, error: "DETECT_FAILED", message: "Could not detect the content language" };
  }
  if (sourceLang === targetLang) {
    return { ok: false, error: "SAME_LANGUAGE", message: "Content is already in the target language" };
  }

  // الكاش — قبل استدعاء المزود
  const key = cacheKey(contentId, sourceLang, targetLang, contentVersion);
  const cached = cacheGet(key);
  if (cached) {
    return { ok: true, translatedText: cached.translatedText, sourceLang, cached: true };
  }

  // استدعاء المزود — على المقطع كله
  try {
    const translatedSegments = await activeProvider.translateBatch(segments, targetLang);
    const translatedText = reassemble(translatedSegments);
    cacheSet(key, { translatedText, sourceLang });
    return { ok: true, translatedText, sourceLang, cached: false };
  } catch (err) {
    if (err?.code === "TIMEOUT") {
      return { ok: false, error: "TIMEOUT", message: "Translation provider timed out" };
    }
    return { ok: false, error: "PROVIDER_FAILED", message: "Translation provider failed" + (err?.message ? ": " + err.message : "") };
  }
}

// ======================================================
// التصدير
// ======================================================

module.exports = {
  translateContent,
  getProviderInfo,
  setProvider,
  SUPPORTED_LANGUAGES,
  MAX_TEXT_LENGTH,
  MAX_TEXT_LENGTH_ARTICLE,
};
