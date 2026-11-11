/**
 * Translation Service â€” Ø®Ø¯Ù…Ø© ØªØ±Ø¬Ù…Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ù†Ø´ÙˆØ±.
 * =====================================================
 * Ø§Ù„Ù…Ø¨Ø§Ø¯Ø¦:
 *  - Ù„Ø§ ØªÙØªØ±Ø¬Ù… Ø¥Ù„Ø§ Ø¹Ù†Ø¯ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… (on-demand).
 *  - Ù„Ø§ ØªÙØ®Ø²Ù† Ø§Ù„ØªØ±Ø¬Ù…Ø© ÙƒÙ…ØµØ¯Ø± Ù„Ù„Ù…Ø­ØªÙˆÙ‰ â€” ØªÙØ®Ø²Ù† ÙÙ‚Ø· ÙÙŠ ÙƒØ§Ø´ Ù…Ø¤Ù‚Øª Ù…Ø±ØªØ¨Ø· Ø¨Ù€
 *    (contentId, sourceLang, targetLang, contentVersion).
 *  - ØºÙŠØ± Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…Ø²ÙˆØ¯ ÙˆØ§Ø­Ø¯: TranslationProvider ÙˆØ§Ø¬Ù‡Ø©ØŒ ÙˆØ§Ù„ØªØ¨Ø¯ÙŠÙ„ Ø¨ÙŠÙ†
 *    Ø§Ù„Ù…Ø²ÙˆØ¯ÙŠÙ† ÙŠØ­Ø¯Ø« ÙÙŠ PROVIDERS Ø¯ÙˆÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£ÙƒÙˆØ§Ø¯ Ø§Ù„Ù…Ø³ØªØ¯Ø¹ÙŠØ©.
 *  - Ø­Ø¯ÙˆØ¯ Ø­Ø¬Ù… ÙˆÙ†ÙØ³ÙŽØ¨ Ø§Ø³ØªØ®Ø¯Ø§Ù… ØµØ§Ø±Ù…Ø© Ù„Ù…Ù†Ø¹ Ø§Ù„Ø¥Ø³Ø§Ø¡Ø©.
 *
 * Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ: LibreTranslate â€” Ù…ÙØªÙˆØ­ Ø§Ù„Ù…ØµØ¯Ø±ØŒ ÙŠÙØ³ØªØ¶Ø§Ù Ø°Ø§ØªÙŠÙ‹Ø§ Ø£Ùˆ Ø¹Ø¨Ø± Ø®Ø¯Ù…Ø© Ù…ÙˆØ«ÙˆÙ‚Ø©.
 *  - Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙˆØ§Ù„Ù…ÙØªØ§Ø­ Ù…Ù† Ù…ØªØºÙŠØ±Ø§Øª Ø§Ù„Ø¨ÙŠØ¦Ø© (LIBRETRANSLATE_URL / LIBRETRANSLATE_API_KEY).
 *  - Ø¨Ø¯ÙˆÙ† LIBRETRANSLATE_URL: Ø§Ù„Ù…Ø²ÙˆØ¯ Ù…Ø¹Ø·Ù‘Ù„ ÙˆØ§Ù„Ø³ÙŠØ±ÙØ± ÙŠØ¹Ù…Ù„ (ØªØ±Ø¬Ù…Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø¨ÙˆØ¶ÙˆØ­).
 *  - source:"auto" ÙŠÙ„ØºÙŠ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ù„ØºØ© ÙƒØ´Ø±Ø· Ù„Ù„ØªØ±Ø¬Ù…Ø©.
 */

const fetch = require("node-fetch");
const nodeFetch = fetch; // gtx provider uses the same fetch implementation

// ======================================================
// Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø­Ù…Ø§ÙŠØ© ÙˆØ§Ù„Ø­Ø¯ÙˆØ¯
// ======================================================

const MAX_TEXT_LENGTH = 5000;          // Ø£Ù‚ØµÙ‰ Ø­Ø¬Ù… Ù†Øµ Ù…Ø·Ù„ÙˆØ¨ Ù„Ù„ØªØ±Ø¬Ù…Ø©
const MAX_TEXT_LENGTH_ARTICLE = 12000; // Ø­Ø¯ Ø£ÙˆØ³Ø¹ Ù„Ù„Ù…Ù‚Ø§Ù„Ø§Øª ÙˆØ§Ù„Ø±ÙˆØ§ÙŠØ§Øª
const MAX_BATCH_SEGMENTS = 20;         // Ø£Ù‚ØµÙ‰ Ø¹Ø¯Ø¯ Ù…Ù‚Ø§Ø·Ø¹ ÙÙŠ Ø·Ù„Ø¨ ÙˆØ§Ø­Ø¯
const MAX_REQUESTS_PER_USER = 60;      // Ø£Ù‚ØµÙ‰ Ø·Ù„Ø¨Ø§Øª ØªØ±Ø¬Ù…Ø© Ù„ÙƒÙ„ Ù…Ø³ØªØ®Ø¯Ù…
const RATE_WINDOW_MS = 10 * 60 * 1000; // Ù†Ø§ÙØ°Ø© Ø§Ù„Ù€ rate limit (10 Ø¯Ù‚Ø§Ø¦Ù‚)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Ù…Ø¯Ø© Ø¨Ù‚Ø§Ø¡ Ø§Ù„ØªØ±Ø¬Ù…Ø© ÙÙŠ Ø§Ù„ÙƒØ§Ø´ (24 Ø³Ø§Ø¹Ø©)
const CACHE_MAX_ENTRIES = 1000;        // Ø£Ù‚ØµÙ‰ Ø¹Ø¯Ø¯ Ù…Ø¯Ø®Ù„Ø§Øª ÙÙŠ Ø§Ù„ÙƒØ§Ø´
const PROVIDER_TIMEOUT_MS = 15000;     // Ù…Ù‡Ù„Ø© ÙƒÙ„ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ù„Ù„Ù…Ø²ÙˆØ¯

// LibreTranslate â€” Ù…Ù† Ù…ØªØºÙŠØ±Ø§Øª Ø§Ù„Ø¨ÙŠØ¦Ø© ÙÙ‚Ø·. Ù„Ø§ Ø¹Ù†ÙˆØ§Ù† Ø«Ø§Ø¨Øª ÙÙŠ Ø§Ù„ÙƒÙˆØ¯.
// ØªÙÙ‚Ø±Ø£ Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠÙ‹Ø§ (ÙˆÙ„ÙŠØ³ const) Ù„ÙŠØ¯Ø¹Ù… Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± ÙˆØ§Ù„ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­ÙŠ.
const libreConfigured = () => Boolean((process.env.LIBRETRANSLATE_URL || "").trim());
const libreUrl = () => (process.env.LIBRETRANSLATE_URL || "").trim().replace(/\/+$/, "");
const libreApiKey = () => process.env.LIBRETRANSLATE_API_KEY || "";


// ======================================================
// gtx â€” keyless secondary provider: translate.googleapis.com (client=gtx)
// ======================================================
// Enabled only when TRANSLATION_GTX_ENABLED=1 (explicit opt-in for prod).
// Free/keyless but unofficial and rate-limit prone â€” stays a fallback;
// LibreTranslate (self-host or keyed instance) remains the primary.
const GTEXT_UA = "Mozilla/5.0 (compatible; BayanSpace/1.0; translation)";
const gtxEnabled = () => process.env.TRANSLATION_GTX_ENABLED === "1";
/** One gtx call per plain-text segment (sl=auto). */
async function gtxCall(text, targetLang) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" +
    encodeURIComponent(targetLang) +
    "&q=" + encodeURIComponent(text);
  let res;
  try {
    res = await withTimeout(nodeFetch(url, { headers: { "User-Agent": GTEXT_UA } }), PROVIDER_TIMEOUT_MS, "gtx");
  } catch (err) {
    if (err?.code === "TIMEOUT" || err?.code === "PROVIDER_TIMEOUT" || err?.name === "AbortError") {
      throw Object.assign(new Error("gtx timed out"), { code: "PROVIDER_TIMEOUT" });
    }
    throw Object.assign(new Error("gtx connection failed"), { code: "PROVIDER_UNAVAILABLE" });
  }
  if (res.status === 429) {
    throw Object.assign(new Error("gtx rate limited"), { code: "RATE_LIMITED" });
  }
  if (res.status === 413 || res.status === 400) {
    throw Object.assign(new Error("gtx rejected payload"), { code: "TOO_LONG" });
  }
  if (!res.ok) {
    throw Object.assign(new Error("gtx HTTP " + res.status), { code: "PROVIDER_FAILED" });
  }
  let raw;
  try { raw = await res.text(); } catch (e) {
    throw Object.assign(new Error("gtx unreadable response"), { code: "INVALID_RESPONSE" });
  }
  let data;
  try { data = JSON.parse(raw); } catch (e) {
    throw Object.assign(new Error("gtx invalid JSON"), { code: "INVALID_RESPONSE" });
  }
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw Object.assign(new Error("gtx unexpected shape"), { code: "INVALID_RESPONSE" });
  }
  const translated = data[0].map((s) => (Array.isArray(s) ? s[0] || "" : "")).join("");
  if (typeof translated !== "string") {
    throw Object.assign(new Error("gtx missing text"), { code: "INVALID_RESPONSE" });
  }
  return { translated, detected: normalizeLangCode(data[2]) || null };
}

const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "de", "pt", "tr", "zh", "ja", "ru"];

// Ø®Ø±ÙŠØ·Ø© Ù…Ù† Ù„ØºØ§Øª Bayan Ø¥Ù„Ù‰ Ø±Ù…ÙˆØ² Ø§Ù„Ù…Ø²ÙˆØ¯
const PROVIDER_LANG_MAP = {
  en: "en", ar: "ar", fr: "fr", es: "es", de: "de",
  pt: "pt", tr: "tr", zh: "zh", ja: "ja", ru: "ru",
};

/** ØªÙˆØ­ÙŠØ¯ Ø±Ù…ÙˆØ² Ø§Ù„Ù„ØºØ§Øª Ù‚Ø¨Ù„ Ø§Ù„Ù…Ù‚Ø§Ø±Ù†Ø© â€” zh-CN / zh-Hans â†’ zhØŒ ÙˆÙ‡ÙƒØ°Ø§ */
const normalizeLangCode = (code) => {
  if (!code || typeof code !== "string") return null;
  const base = code.toLowerCase().split("-")[0];
  return base || null;
};

/** Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ LibreTranslate Ù…Ø¹ timeout ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ø£Ø®Ø·Ø§Ø¡ ÙˆØ§Ø¶Ø­Ø© */
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

/** Ø¬Ù„Ø¨ Ø§Ù„Ù„ØºØ§Øª Ø§Ù„Ù…Ø¯Ø¹ÙˆÙ…Ø© ÙØ¹Ù„ÙŠÙ‹Ø§ Ù…Ù† Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© â€” ÙŠÙØ®Ø²Ù† Ø¹Ù†Ø¯ Ø§Ù„Ø¥Ù‚Ù„Ø§Ø¹ */
let providerLanguages = null; // null = Ù„Ù… ÙŠÙØ¬Ù„Ø¨ Ø¨Ø¹Ø¯
async function refreshProviderLanguages() {
  try {
    const data = await libreCall("/languages", {});
    if (Array.isArray(data)) {
      providerLanguages = data.map((l) => normalizeLangCode(l.code)).filter(Boolean);
      console.log("ðŸŒ LibreTranslate languages:", providerLanguages.join(", "));
    }
  } catch (err) {
    console.error("ðŸŒ LibreTranslate /languages failed:", err.message);
  }
  return providerLanguages;
}

const isLanguageSupportedByProvider = (lang) =>
  providerLanguages === null || providerLanguages.includes(normalizeLangCode(lang));

// ======================================================
// Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø²ÙˆØ¯ (Provider abstraction)
// ======================================================

/**
 * TranslationProvider â€” Ø§Ù„Ø¹Ù‚Ø¯ Ø§Ù„Ø°ÙŠ ÙŠÙØ·Ø¨Ù‚Ù‡ Ø£ÙŠ Ù…Ø²ÙˆØ¯.
 *   translateBatch(texts, targetLang) â†’ { texts: [...], sourceLang }
 */
/**
 * Timeout wrapper â€” ÙŠÙ…Ù†Ø¹ ØªØ¹Ù„ÙŠÙ‚ Ø§Ù„Ø·Ù„Ø¨ Ø¥Ø°Ø§ Ù„Ù… ÙŠØ±Ø¯ Ø§Ù„Ù…Ø²ÙˆØ¯.
 * Ø§Ù„Ø®Ø·Ø£ ÙŠÙ…ÙŠÙ‘Ø² Ø¨ÙˆØ¶ÙˆØ­: TIMEOUT â‰  ÙØ´Ù„ Ø§Ù„Ù…Ø²ÙˆØ¯.
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

  gtx: {
    name: "Google translate_a/single (gtx) â€” keyless fallback",
    /** Batch translate â€” one call per segment with auto-detect. */
    async translateBatch(texts, targetLang) {
      const target = PROVIDER_LANG_MAP[targetLang] || targetLang;
      const out = [];
      let detected = null;
      for (const text of texts) {
        const r = await gtxCall(text, target);
        if (!detected && r.detected) detected = r.detected;
        out.push(r.translated);
      }
      if (detected && out.length > 0) lastDetectedLang = detected;
      return out;
    },
    /** Detection from the gtx response â€” failure is non-blocking. */
    async detectLanguage(text) {
      try {
        const r = await gtxCall(text, "en");
        return r.detected;
      } catch (err) {
        return null;
      }
    },
  },
  libretranslate: {
    name: "LibreTranslate (self-hosted or trusted instance)",
    /**
     * ØªØ±Ø¬Ù…Ø© Ø¯ÙØ¹Ø© Ù…Ù‚Ø§Ø·Ø¹ â€” Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ù„ÙƒÙ„ Ù…Ù‚Ø·Ø¹ Ø¨Ù€ source:"auto".
     * Ù„Ø§ Ù†ÙØªØ±Ø¶ Ø­ÙØ¸ HTML Ø§Ù„Ù…Ø¹Ù‚Ø¯ â€” ÙƒÙ„ Ù…Ù‚Ø·Ø¹ Ù†ØµÙŠ ÙÙ‚Ø·ØŒ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ¬Ù…ÙŠØ¹ ØªØ­ÙØ¸ Ø§Ù„ÙˆØ³ÙˆÙ….
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
        // Ø§Ø®ØªÙŠØ§Ø±ÙŠ: Ø§Ù„Ù„ØºØ© Ø§Ù„Ù…ÙƒØªØ´ÙØ© Ù…Ù† Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© â€” ØºÙŠØ± Ù…Ø¶Ù…ÙˆÙ†Ø© ÙÙŠ ÙƒÙ„ Ø§Ù„Ù†Ø³Ø®
        if (data.detectedLanguage?.language && out.length === 0) {
          lastDetectedLang = normalizeLangCode(data.detectedLanguage.language);
        }
        out.push(translated);
      }
      return out;
    },
    /** Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ù„ØºØ© â€” endpoint /detect Ø£Ùˆ ÙŠÙØ±Ø¬Ø¹ null Ø¹Ù†Ø¯ Ø§Ù„ØªØ¹Ø°Ø± */
    async detectLanguage(text) {
      try {
        const data = await libreCall("/detect", { q: text });
        const first = Array.isArray(data) ? data[0] : data;
        const code = first?.language || first?.code;
        return normalizeLangCode(code);
      } catch (err) {
        // Ø§Ù„Ø§ÙƒØªØ´Ø§Ù Ø§Ø®ØªÙŠØ§Ø±ÙŠ â€” Ù„Ø§ Ù†Ù…Ù†Ø¹ Ø§Ù„ØªØ±Ø¬Ù…Ø© Ø¨Ø³Ø¨Ø¨ ÙØ´Ù„Ù‡
        return null;
      }
    },
  },
};

let lastDetectedLang = null;

// Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù†Ø´Ø· â€” LibreTranslate
let activeProvider = libreConfigured()
  ? PROVIDERS.libretranslate
  : (gtxEnabled() ? PROVIDERS.gtx : PROVIDERS.libretranslate);
const anyProviderConfigured = () => libreConfigured() || gtxEnabled();
let providerAvailable = anyProviderConfigured();
// Primary recovery: after a failure, skip the primary briefly (avoid request
// storms), then give it another chance automatically (no restart needed).
const PRIMARY_RETRY_MS = Number(process.env.TRANSLATION_PRIMARY_RETRY_MS) || 60 * 1000;
let primaryCooldownUntil = 0; // false only when every provider is off

function setProvider(name) {
  if (!PROVIDERS[name]) throw new Error(`Unknown provider: ${name}`);
  activeProvider = PROVIDERS[name];
}

function getProviderInfo() {
  return {
    name: activeProvider.name,
    available: providerAvailable,
    configured: anyProviderConfigured(),
    primaryConfigured: libreConfigured(),
    fallbackEnabled: gtxEnabled(),
    providerLanguages, // null Ø¥Ø°Ø§ Ù„Ù… ØªÙØ¬Ù„Ø¨ Ø¨Ø¹Ø¯
    maxTextLength: MAX_TEXT_LENGTH,
    maxTextLengthArticle: MAX_TEXT_LENGTH_ARTICLE,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

// ÙØ­Øµ Ø¹Ù†Ø¯ Ø§Ù„Ø¥Ù‚Ù„Ø§Ø¹ â€” Ø§Ø®ØªÙŠØ§Ø±ÙŠ: Ù„Ø§ ÙŠÙ…Ù†Ø¹ Ø§Ù„Ø®Ø¯Ù…Ø© Ù…Ù† Ø§Ù„Ø¹Ù…Ù„ Ø¹Ù†Ø¯ Ø£ÙˆÙ„ Ø·Ù„Ø¨ Ø­Ù‚ÙŠÙ‚ÙŠ
// (providerAvailable ÙŠÙØ­Ø¯Ù‘Ø« Ø¹Ù†Ø¯ ÙƒÙ„ ÙØ´Ù„/Ù†Ø¬Ø§Ø­ ÙØ¹Ù„ÙŠØŒ ÙˆÙ„ÙŠØ³ Ù‚Ø±Ø§Ø¯Ø© Ø¥Ù‚Ù„Ø§Ø¹ ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø·)
(async () => {
  if (libreConfigured()) {
    try {
      await refreshProviderLanguages();
      await activeProvider.translateBatch(["ok"], "en");
      providerAvailable = true;
      console.log("\u{1F310} Translation provider ready:", activeProvider.name);
    } catch (err) {
      console.warn("\u{1F310} LibreTranslate initial check failed (will retry per request):", err.message);
      providerAvailable = anyProviderConfigured();
    }
  } else if (gtxEnabled()) {
    try {
      await PROVIDERS.gtx.translateBatch(["ok"], "en");
      providerAvailable = true;
      console.log("\u{1F310} Translation provider ready (fallback):", PROVIDERS.gtx.name);
    } catch (err) {
      console.warn("\u{1F310} gtx initial check failed (will retry per request):", err.message);
      providerAvailable = false;
    }
  } else {
    providerAvailable = false;
    console.error("\u{1F310} No translation provider configured \u2014 translation disabled (server keeps running)");
  }
})();

// ======================================================
// Cache â€” Ù…Ø±ØªØ¨Ø· Ø¨Ù€ (contentId, sourceLang, targetLang, contentVersion)
// ======================================================

// LRU Ø¨Ø³ÙŠØ· ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© â€” ÙŠÙÙØ±ÙŽÙ‘Øº Ø¹Ù†Ø¯ Ø§Ù„Ø¥Ù‚Ù„Ø§Ø¹.
// Ù†ØªÙŠØ¬Ø© Ø§Ù„ØªØ±Ø¬Ù…Ø© Ù„Ø§ ØªÙØ®Ø²Ù† ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø£ØµÙ„ÙŠØ© Ø¥Ø·Ù„Ø§Ù‚Ù‹Ø§.
const cache = new Map(); // key â†’ { translated, sourceLang, createdAt, expiresAt }

const cacheKey = (contentId, sourceLang, targetLang, contentVersion) =>
  `${contentId}:${sourceLang}:${targetLang}:${contentVersion || 0}`;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // ØªØ­Ø¯ÙŠØ« ØªØ±ØªÙŠØ¨ LRU
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
// Rate limiting â€” Ù…Ù†Ø¹ Ø¥Ø³Ø§Ø¡Ø© Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø®Ø¯Ù…Ø© Ø§Ù„ØªØ±Ø¬Ù…Ø©
// ======================================================

const rateMap = new Map(); // userId â†’ { timestamps: [...] }

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
// Ø§Ù„Ù†Øµ â†’ Ù…Ù‚Ø§Ø·Ø¹ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ±Ø¬Ù…Ø© (Ù…Ø­Ø§ÙØ¸Ù‹Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙˆØ§Ø¨Ø· ÙˆØ§Ù„ØªÙ†Ø³ÙŠÙ‚)
// ======================================================

/**
 * ØªÙ‚Ø³ÙŠÙ… HTML Ø¥Ù„Ù‰ Ù…Ù‚Ø§Ø·Ø¹ Ù†ØµÙŠØ© Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ±Ø¬Ù…Ø©ØŒ Ù…Ø¹ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø§Ù„ÙˆØ³ÙˆÙ…
 * (Ø§Ù„Ø±ÙˆØ§Ø¨Ø·ØŒ Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†ØŒ Ø§Ù„ÙÙˆØ§ØµÙ„) Ø¯ÙˆÙ† ØªØ±Ø¬Ù…ØªÙ‡Ø§.
 * ÙƒÙ„ ÙˆØ³Ù… Ø¨Ù†ÙŠÙˆÙŠ ÙŠÙØ­ÙØ¸ ÙƒÙ…ÙŽØ³Ù’Ù†ÙŽÙ†ØŒ ÙˆØ§Ù„Ù†Øµ Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠ Ù‡Ùˆ Ù…Ø§ ÙŠÙØªØ±Ø¬Ù… ÙÙ‚Ø·.
 */
const STRUCTURAL_TAG = /(<\/?(?:p|div|br|h[1-6]|li|ul|ol|blockquote|hr|figure|figcaption|img|a|strong|em|b|i|span)\b[^>]*>)/gi;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

function splitHtmlIntoSegments(html) {
  if (!html) return { segments: [], skeleton: (t) => t };
  // Ø§Ø³ØªØ¨Ø¯Ù„ Ø§Ù„Ø±ÙˆØ§Ø¨Ø· Ø¨Ø¹Ù„Ø§Ù…Ø§Øª Ù…Ø¤Ù‚ØªØ© Ø­ØªÙ‰ Ù„Ø§ ØªÙØªØ±Ø¬Ù…
  const urlMap = [];
  let htmlNoUrls = html.replace(URL_PATTERN, (m) => {
    urlMap.push(m);
    return ` [[URL_${urlMap.length - 1}]] `;
  });

  // ÙØµÙ„ Ø§Ù„ÙˆØ³ÙˆÙ… Ø§Ù„Ø¨Ù†ÙŠÙˆÙŠØ© Ø¹Ù† Ø§Ù„Ù†Øµ
  const parts = htmlNoUrls.split(STRUCTURAL_TAG).filter((p) => p !== "");
  const segments = [];   // Ø§Ù„Ù†ØµÙˆØµ Ø§Ù„Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ±Ø¬Ù…Ø©
  const skeleton = [];   // Ø®Ø±ÙŠØ·Ø©: { type: "tag" | "text", value }

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
      // Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø§Ù„Ø±ÙˆØ§Ø¨Ø· â€” Ø¯Ø§Ø®Ù„ Ø§Ù„Ø³Ù…Ø§Øª Ø£ÙˆÙ„Ø§Ù‹ (Ø¨Ù„Ø§ Ù…Ø³Ø§ÙØ§Øª Ø­Ø§Ø´ÙŠØ©) Ø«Ù… Ø¹Ø§Ù…Ø©Ù‹
      out = out
        .replace(/"\s*\[\[URL_(\d+)\]\]\s*"/g, (_, idx) => '"' + (urlMap[Number(idx)] || "") + '"')
        .replace(/\[\[URL_(\d+)\]\]/g, (_, idx) => urlMap[Number(idx)] || "");
      return out;
    },
  };
}

// ======================================================
// Ø¯Ø§Ù„Ø© Ø§Ù„ØªØ±Ø¬Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
// ======================================================

/**
 * translateContent â€” ÙŠÙØªØ±Ø¬Ù… Ù…Ø­ØªÙˆÙ‰ Ù…Ù†Ø´ÙˆØ± Ø¹Ù†Ø¯ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….
 * @param {object} options
 * @param {string} options.contentId   â€” Ù…Ø¹Ø±Ù Ø§Ù„Ù…Ø­ØªÙˆÙ‰ (Ù„Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…Ø¤Ù‚Øª)
 * @param {string} options.content     â€” HTML Ø£Ùˆ Ù†Øµ Ù…Ù†Ø´ÙˆØ± Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… (Ø§Ù„Ø£ØµÙ„ØŒ Ù„Ø§ ÙŠÙØºÙŠÙ‘Ø±)
 * @param {string} options.contentVersion â€” Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ù…Ø­ØªÙˆÙ‰ (updatedAt Ø£Ùˆ hash)
 * @param {string} options.targetLang  â€” Ù„ØºØ© Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
 * @param {string} options.userId      â€” Ù„Ù„Ù€ rate limit
 * @param {boolean} options.isLong     â€” Ù…Ù‚Ø§Ù„ Ø£Ùˆ Ø±ÙˆØ§ÙŠØ© (Ø­Ø¯ Ø£ÙˆØ³Ø¹)
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
  // Ù‚Ø±Ø§Ø¡Ø© Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØ© â€” ØªØ³Ù…Ø­ Ø¨Ø§Ø®ØªØ¨Ø§Ø± Ø¹Ø¯Ù… Ø§Ù„Ø¶Ø¨Ø· Ø¯ÙˆÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©
  if (!anyProviderConfigured()) {
    return { ok: false, error: "PROVIDER_UNAVAILABLE", message: "Translation provider is not configured" };
  }

  const maxLength = isLong ? MAX_TEXT_LENGTH_ARTICLE : MAX_TEXT_LENGTH;
  if (content.length > maxLength) {
    return { ok: false, error: "TOO_LONG", message: `Content exceeds the maximum of ${maxLength} characters` };
  }

  if (!isLanguageSupportedByProvider(targetLang)) {
    return { ok: false, error: "UNSUPPORTED_LANGUAGE", message: `Target language '${targetLang}' is not supported by the translation provider` };
  }

  // Ø¨ØµÙ…Ø© Ø§Ù„Ù†Øµ Ø§Ù„Ø£ØµÙ„ÙŠ â€” ØªÙ…Ù†Ø¹ Ø¥Ø¹Ø§Ø¯Ø© Ù†ØªÙŠØ¬Ø© Ù‚Ø¯ÙŠÙ…Ø© Ù„Ù†ÙØ³ contentId Ø¥Ø°Ø§ ØªØºÙŠØ± Ø§Ù„Ù†Øµ
  const crypto = require("crypto");
  const contentHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);

  // Ø§Ù„ÙƒØ§Ø´ â€” Ù‚Ø¨Ù„ Rate Limit ÙˆØ§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ù…Ø²ÙˆØ¯ (Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø§Ù„ØµØ§Ù„Ø­Ø© Ù„Ø§ ØªØ³ØªÙ‡Ù„Ùƒ Ø§Ù„Ø­ØµØ©)
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

  // ØªÙ‚Ø³ÙŠÙ… Ø§Ù„Ù…Ø­ØªÙˆÙ‰
  const { segments, reassemble } = splitHtmlIntoSegments(content);
  if (segments.length === 0) return { ok: false, error: "EMPTY", message: "No translatable content" };
  if (segments.length > MAX_BATCH_SEGMENTS * 4) {
    return { ok: false, error: "TOO_LONG", message: "Too many segments to translate" };
  }

  // Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ù„ØºØ© Ø§Ù„Ù…ØµØ¯Ø± â€” Ø§Ø®ØªÙŠØ§Ø±ÙŠ: Ø¥Ù† ÙØ´Ù„ØŒ Ù†ÙƒÙ…Ù„ Ø¨Ù€ source:"auto"
  // ÙˆÙ„Ø§ Ù†Ù…Ù†Ø¹ Ø§Ù„ØªØ±Ø¬Ù…Ø© Ù„Ù…Ø¬Ø±Ø¯ ØªØ¹Ø°Ø± Ø§Ù„Ø§ÙƒØªØ´Ø§Ù.
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
      // Ù„ØºØ© Ù…ÙƒØªØ´ÙØ© Ø®Ø§Ø±Ø¬ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© â€” Ù†ØªØ¬Ø§Ù‡Ù„ Ø§Ù„Ø§ÙƒØªØ´Ø§Ù ÙˆÙ†ÙƒÙ…Ù„ Ø¨Ù€ auto
      sourceLang = null;
    }
  }

  // Ø§Ù„ÙƒØ§Ø´ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ â€” Ù…Ø±ØªØ¨Ø· Ø¨Ù€ contentId + Ø¨ØµÙ…Ø© Ø§Ù„Ù†Øµ + Ø§Ù„Ù„ØºØ§Øª
  const key = cacheKey(contentId, sourceLang || "unknown", targetLang, contentHash);
  const cached = cacheGet(key);
  if (cached) {
    return { ok: true, translatedText: cached.translatedText, sourceLang: cached.sourceLang, cached: true };
  }

  // Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ù…Ø²ÙˆØ¯ â€” Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù‚Ø·Ø¹ ÙƒÙ„Ù‡
  try {
    let translatedSegments;
    const primaryCooling = Date.now() < primaryCooldownUntil;
    try {
      if (primaryCooling && gtxEnabled() && activeProvider !== PROVIDERS.gtx) {
        // Cooldown window: gtx first; the primary gets its next chance after
        // the window â€” automatic recovery without a restart.
        throw Object.assign(new Error("primary cooling down"), { code: "PRIMARY_COOLDOWN" });
      }
      translatedSegments = await activeProvider.translateBatch(segments, targetLang);
    } catch (primaryErr) {
      // Controlled one-shot failover to the keyless gtx fallback (if enabled)
      // on transient primary failures â€” never on RATE_LIMITED/TOO_LONG which
      // are payload/user problems, not provider problems.
      if (primaryErr?.code === "PRIMARY_COOLDOWN") {
        // Cooldown window: serve via gtx without re-arming the cooldown.
        translatedSegments = await PROVIDERS.gtx.translateBatch(segments, targetLang);
      } else {
        const transient = !["RATE_LIMITED", "TOO_LONG", "TIMEOUT", "PROVIDER_TIMEOUT"].includes(primaryErr?.code);
        if (gtxEnabled() && activeProvider !== PROVIDERS.gtx && transient) {
          try {
            translatedSegments = await PROVIDERS.gtx.translateBatch(segments, targetLang);
          } catch (fallbackErr) {
            // Fallback also failed: arm the cooldown so the primary gets a
            // breather, then surface the most informative error.
            primaryCooldownUntil = Date.now() + PRIMARY_RETRY_MS;
            // Do not mask the primary failure: a primary TIMEOUT stays TIMEOUT
            throw primaryErr.code === "TIMEOUT" || primaryErr.code === "PROVIDER_TIMEOUT"
              ? primaryErr
              : fallbackErr;
          }
        } else {
          // Non-transient (user/payload-side) error or no fallback enabled:
          // surface the primary error as-is — never continue without segments.
          throw primaryErr;
        }
      }
    }
    if (!Array.isArray(translatedSegments)) {
      throw Object.assign(new Error("no translated segments produced"), { code: "PROVIDER_FAILED" });
    }
    const translatedText = reassemble(translatedSegments);
    // Detection may have arrived from the fallback provider â€” enforce
    // SAME_LANGUAGE consistently regardless of which provider served.
    if (
      targetLang !== "auto" &&
      lastDetectedLang &&
      lastDetectedLang === targetLang &&
      !targetLang.startsWith("zh") // zh-Hans/zh-Hant overlaps tolerated
    ) {
      return { ok: false, error: "SAME_LANGUAGE", message: "Source and target languages appear to be the same" };
    }
    // sourceLang Ù‚Ø¯ ÙŠÙƒÙˆÙ† null Ø¥Ø°Ø§ ÙØ´Ù„ Ø§Ù„Ø§ÙƒØªØ´Ø§Ù â€” Ù†ÙØ±Ø¬Ø¹ "unknown" Ù„Ù„ÙˆØ§Ø¬Ù‡Ø©
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
    if (err?.code === "RATE_LIMITED") {
      return { ok: false, error: "RATE_LIMITED", message: "Translation provider is rate limiting requests" };
    }
    if (err?.code === "TOO_LONG") {
      return { ok: false, error: "TOO_LONG", message: "Content exceeds the translation size limit" };
    }
    if (process.env.TRANSLATION_DEBUG_STACK === "1") {
      console.error("[DBG]", err?.code, "|", err?.message, "\n", String(err?.stack).slice(0, 800));
    }
    return { ok: false, error: "PROVIDER_FAILED", message: "Translation provider failed" };
  }
}

// ======================================================
// Ø§Ù„ØªØµØ¯ÙŠØ±
// ======================================================

module.exports = {
  translateContent,
  getProviderInfo,
  setProvider,
  SUPPORTED_LANGUAGES,
  MAX_TEXT_LENGTH,
  MAX_TEXT_LENGTH_ARTICLE,
};
