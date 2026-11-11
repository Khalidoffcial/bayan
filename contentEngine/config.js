/**
 * contentEngine/config.js — Bayan Content Engine configuration.
 *
 * Everything tunable comes from environment variables with safe defaults.
 * The engine never publishes automatically unless APPROVAL_REQUIRED=false
 * AND autoPublish=true — initial mode is strictly approval-gated (safety
 * contract from the Bayan Space autonomous content ecosystem spec).
 */

const bool = (v, dflt) => (v === undefined || v === "" ? dflt : String(v).toLowerCase() === "true");
const num = (v, dflt) => (Number.isFinite(Number(v)) && v !== undefined && v !== "" ? Number(v) : dflt);

const config = {
    // ── Master switches ──
    enabled: bool(process.env.CONTENT_ENGINE_ENABLED, true),
    approvalRequired: bool(process.env.CONTENT_ENGINE_APPROVAL_REQUIRED, true), // safety first
    autoPublish: bool(process.env.CONTENT_ENGINE_AUTO_PUBLISH, false),

    // ── Generation (local Ollama) ──
    ollama: {
        url: process.env.OLLAMA_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "mistral",
        temperature: num(process.env.OLLAMA_TEMPERATURE, 0.7),
        numCtx: num(process.env.OLLAMA_NUM_CTX, 4096),   // conservative: low-RAM host
        numPredictMax: num(process.env.OLLAMA_NUM_PREDICT, 2048),
        requestTimeoutMs: num(process.env.OLLAMA_TIMEOUT_MS, 180000),
    },

    // ── Publishing limits (per rolling 24h window) ──
    limits: {
        maxArticlesPerDay: num(process.env.CE_MAX_ARTICLES_PER_DAY, 6),
        maxPostsPerDay: num(process.env.CE_MAX_POSTS_PER_DAY, 8),
        maxNovelsPerDay: num(process.env.CE_MAX_NOVELS_PER_DAY, 2),
        maxTotalPerDay: num(process.env.CE_MAX_TOTAL_PER_DAY, 12),
    },

    // ── Queue / scheduler ──
    queue: {
        maxConcurrentJobs: num(process.env.CE_MAX_CONCURRENT, 1), // low-RAM host: serialize
        retryBackoffBaseMs: num(process.env.CE_RETRY_BASE_MS, 30000),
        retryBackoffMaxMs: num(process.env.CE_RETRY_MAX_MS, 3600000),
        maxRetries: num(process.env.CE_MAX_RETRIES, 3),
        tickIntervalMs: num(process.env.CE_TICK_MS, 60000),
        persisted: true, // queue lives in RTDB `content_engine/queue` — survives restarts
    },

    // ── Languages (priority order) ──
    languages: [
        { code: "ar", name: "Arabic", rtl: true, enabled: true },
        { code: "en", name: "English", rtl: false, enabled: true },
        { code: "fr", name: "French", rtl: false, enabled: true },
        { code: "es", name: "Spanish", rtl: false, enabled: true },
        { code: "de", name: "German", rtl: false, enabled: true },
        { code: "zh", name: "Chinese", rtl: false, enabled: false }, // off until QC proven
    ],

    // ── Image sourcing ──
    images: {
        enabled: bool(process.env.CE_IMAGES_ENABLED, false), // only when a licensed source is configured
        wikimedia: bool(process.env.CE_IMAGES_WIKIMEDIA, true), // CC/public-domain search permitted
        neverRandom: true,  // no unrelated decorative images — ever
        altTextRequired: true,
    },
};

module.exports = config;
