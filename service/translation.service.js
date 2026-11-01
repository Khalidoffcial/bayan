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
 * المزود الحالي: LibreTranslate — مفتوح المصدر، يُستضاف ذاتيًا أو عبر خدمة موثوقة.
 *  - العنوان والمفتاح من متغيرات البيئة (LIBRETRANSLATE_URL / LIBRETRANSLATE_API_KEY).
 *  - بدون LIBRETRANSLATE_URL: المزود معطّل والسيرفر يعمل (ترجمة غير متاحة بوضوح).
 *  - source:"auto" يلغي الاعتماد على اكتشاف اللغة كشرط للترجمة.
 */

const fetch = require("node-fetch");

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

// LibreTranslate — من متغيرات البيئة فقط. لا عنوان ثابت في الكود.
// تُقرأ ديناميكيًا (وليس const) ليدعم الاختبار والتحديث الحي.
const libreConfigured = () => Boolean((process.env.LIBRETRANSLATE_URL || "").trim());
const libreUrl = () => (process.env.LIBRETRANSLATE_URL || "").trim().replace(/\/+$/, "");
const libreApiKey = () => process.env.LIBRETRANSLATE_API_KEY || "";

const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "de", "pt", "tr", "zh", "ja", "ru"];

// خريطة من لغات Bayan إلى رموز المزود
const PROVIDER_LANG_MAP = {
  en: "en", ar: "ar", fr: "fr", es: "es", de: "de",
  pt: "pt", tr: "tr", zh: "zh", ja: "ja", ru: "ru",
};

/** توحيد رموز اللغات قبل المقارنة — zh-CN / zh-Hans → zh، وهكذا */
const normalizeLangCode = (code) => {
  if (!code || typeof code !== "string") return null;
  const base = code.toLowerCase().split("-")[0];
  return base || null;
};

/** استدعاء LibreTranslate مع timeout ومعالجة أخطاء واضحة */
async function libreCall(endpoint, body) {
  if (!libreConfigured()) {
    throw Object.assign(new Error("LibreTranslate URL is not configured"), { code: "PROVIDER_UNAVAILABLE" });
  }
  const payload = { ...body };
  const apiKey = libreApiKey();
  if (apiKey) payload.api_key = apiKey;

  let res;
  try {
    res = await withTimeout(
      fetch(`${libreUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      PROVIDER_TIMEOUT_MS
    );
  } catch (err) {
    if (err?.code === "TIMEOUT") throw err;
    throw Object.assign(new Error("LibreTranslate connection failed"), { code: "PROVIDER_UNAVAILABLE" });
  }

  if (res.status === 429) {
    throw Object.assign(new Error("LibreTranslate rate limited"), { code: "RATE_LIMITED" });
  }
  if (res.status === 403) {
    throw Object.assign(new Error("LibreTranslate API key invalid"), { code: "PROVIDER_FAILED" });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`LibreTranslate HTTP ${res.status}`), { code: "PROVIDER_FAILED" });
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw Object.assign(new Error("Invalid JSON from LibreTranslate"), { code: "INVALID_RESPONSE" });
  }
  return data;
}

/** جلب اللغات المدعومة فعليًا من النسخة المستخدمة — يُخزن عند الإقلاع */
let providerLanguages = null; // null = لم يُجلب بعد
async function refreshProviderLanguages() {
  try {
    const data = await libreCall("/languages", {});
    if (Array.isArray(data)) {
      providerLanguages = data.map((l) => normalizeLangCode(l.code)).filter(Boolean);
      console.log("🌐 LibreTranslate languages:", providerLanguages.join(", "));
    }
  } catch (err) {
    console.error("🌐 LibreTranslate /languages failed:", err.message);
  }
  return providerLanguages;
}

const isLanguageSupportedByProvider = (lang) =>
  providerLanguages === null || providerLanguages.includes(normalizeLangCode(lang));

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
  libretranslate: {
    name: "LibreTranslate (self-hosted or trusted instance)",
    /**
     * ترجمة دفعة مقاطع — استدعاء لكل مقطع بـ source:"auto".
     * لا نفترض حفظ HTML المعقد — كل مقطع نصي فقط، وإعادة التجميع تحفظ الوسوم.
     */
    async translateBatch(texts, targetLang) {
      const target = PROVIDER_LANG_MAP[targetLang] || targetLang;
      const out = [];
      for (const text of texts) {
        const data = await libreCall("/translate", {
          q: text,
          source: "auto",
          target,
          format: "text",
        });
        const translated = data?.translatedText;
        if (typeof translated !== "string") {
          throw Object.assign(new Error("Missing translatedText in response"), { code: "INVALID_RESPONSE" });
        }
        // اختياري: اللغة المكتشفة من الاستجابة — غير مضمونة في كل النسخ
        if (data.detectedLanguage?.language && out.length === 0) {
          lastDetectedLang = normalizeLangCode(data.detectedLanguage.language);
        }
        out.push(translated);
      }
      return out;
    },
    /** اكتشاف اللغة — endpoint /detect أو يُرجع null عند التعذر */
    async detectLanguage(text) {
      try {
        const data = await libreCall("/detect", { q: text });
        const first = Array.isArray(data) ? data[0] : data;
        const code = first?.language || first?.code;
        return normalizeLangCode(code);
      } catch (err) {
        // الاكتشاف اختياري — لا نمنع الترجمة بسبب فشله
        return null;
      }
    },
  },
};

let lastDetectedLang = null;

// المزود النشط — LibreTranslate
let activeProvider = PROVIDERS.libretranslate;
let providerAvailable = libreConfigured(); // false إذا لم يُضبط LIBRETRANSLATE_URL

function setProvider(name) {
  if (!PROVIDERS[name]) throw new Error(`Unknown provider: ${name}`);
  activeProvider = PROVIDERS[name];
}

function getProviderInfo() {
  return {
    name: activeProvider.name,
    available: providerAvailable,
    configured: libreConfigured(),
    providerLanguages, // null إذا لم تُجلب بعد
    maxTextLength: MAX_TEXT_LENGTH,
    maxTextLengthArticle: MAX_TEXT_LENGTH_ARTICLE,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

// فحص عند الإقلاع — اختياري: لا يمنع الخدمة من العمل عند أول طلب حقيقي
// (providerAvailable يُحدّث عند كل فشل/نجاح فعلي، وليس قرادة إقلاع واحدة فقط)
(async () => {
  if (!libreConfigured()) {
    providerAvailable = false;
    console.error("🌐 LIBRETRANSLATE_URL not set — translation provider disabled (server keeps running)");
    return;
  }
  try {
    await refreshProviderLanguages();
    await activeProvider.translateBatch(["ok"], "en");
    providerAvailable = true;
    console.log("🌐 Translation provider ready:", activeProvider.name);
  } catch (err) {
    // لا نقفل الخدمة نهائيًا — قد تكون اللحظة الأولى بطيئة فقط
    console.warn("🌐 LibreTranslate initial check failed (will retry per request):", err.message);
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
  // قراءة ديناميكية — تسمح باختبار عدم الضبط دون إعادة تحميل الوحدة
  if (!libreConfigured()) {
    return { ok: false, error: "PROVIDER_UNAVAILABLE", message: "Translation provider is not configured" };
  }

  const maxLength = isLong ? MAX_TEXT_LENGTH_ARTICLE : MAX_TEXT_LENGTH;
  if (content.length > maxLength) {
    return { ok: false, error: "TOO_LONG", message: `Content exceeds the maximum of ${maxLength} characters` };
  }

  if (!isLanguageSupportedByProvider(targetLang)) {
    return { ok: false, error: "UNSUPPORTED_LANGUAGE", message: `Target language '${targetLang}' is not supported by the translation provider` };
  }

  // بصمة النص الأصلي — تمنع إعادة نتيجة قديمة لنفس contentId إذا تغير النص
  const crypto = require("crypto");
  const contentHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);

  // الكاش — قبل Rate Limit واستدعاء المزود (النتيجة الصالحة لا تستهلك الحصة)
  const preKey = cacheKey(contentId, "pre", targetLang, contentHash);
  const preCached = cacheGet(preKey);
  if (preCached) {
    return { ok: true, translatedText: preCached.translatedText, sourceLang: preCached.sourceLang, cached: true };
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

  // اكتشاف اللغة المصدر — اختياري: إن فشل، نكمل بـ source:"auto"
  // ولا نمنع الترجمة لمجرد تعذر الاكتشاف.
  let sourceLang = null;
  let detectErr = null;
  const probeSegments = segments.slice(0, 3);
  for (const seg of probeSegments) {
    try {
      const detected = await activeProvider.detectLanguage(seg);
      if (detected) { sourceLang = normalizeLangCode(detected); break; }
    } catch (err) {
      detectErr = err;
      if (err?.code === "TIMEOUT") break;
    }
  }

  if (sourceLang) {
    if (sourceLang === targetLang) {
      return { ok: false, error: "SAME_LANGUAGE", message: "Content is already in the target language" };
    }
    if (!SUPPORTED_LANGUAGES.includes(sourceLang)) {
      // لغة مكتشفة خارج القائمة — نتجاهل الاكتشاف ونكمل بـ auto
      sourceLang = null;
    }
  }

  // الكاش الرئيسي — مرتبط بـ contentId + بصمة النص + اللغات
  const key = cacheKey(contentId, sourceLang || "unknown", targetLang, contentHash);
  const cached = cacheGet(key);
  if (cached) {
    return { ok: true, translatedText: cached.translatedText, sourceLang: cached.sourceLang, cached: true };
  }

  // استدعاء المزود — على المقطع كله
  try {
    const translatedSegments = await activeProvider.translateBatch(segments, targetLang);
    const translatedText = reassemble(translatedSegments);
    // sourceLang قد يكون null إذا فشل الاكتشاف — نُرجع "unknown" للواجهة
    const finalSourceLang = sourceLang || lastDetectedLang || "unknown";
    cacheSet(key, { translatedText, sourceLang: finalSourceLang });
    return { ok: true, translatedText, sourceLang: finalSourceLang, cached: false };
  } catch (err) {
    if (err?.code === "TIMEOUT") {
      return { ok: false, error: "PROVIDER_TIMEOUT", message: "Translation provider timed out" };
    }
    if (err?.code === "PROVIDER_UNAVAILABLE") {
      return { ok: false, error: "PROVIDER_UNAVAILABLE", message: "Translation provider is not reachable" };
    }
    if (err?.code === "INVALID_RESPONSE") {
      return { ok: false, error: "INVALID_RESPONSE", message: "Translation provider returned an invalid response" };
    }
    return { ok: false, error: "PROVIDER_FAILED", message: "Translation provider failed" };
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
