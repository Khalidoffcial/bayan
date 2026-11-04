/**
 * AudioHub service — بحث + مزودو المحتوى لنظام الصوت الدائم (Audio Hub).
 *
 * المزودون (مختارون بعناية، تراخيص موثقة):
 *   1. Openverse (api.openverse.org/v1/audio) — بحث موسيقى CC، بلا مفتاح
 *      (الحد المجاني ~20 req/min -> يجري كل بحث عبر cache + rate-limit).
 *      كل نتيجة تحمل license_url + foreign_landing_url + duration + thumbnail.
 *      نمرر filter_dead=true لضمان روابط صوت حية (لا روابط ميتة).
 *
 *   2. mp3quran.net — قِراء المصحف (audio/mpeg، متاح علنًا).
 *
 *   3. SoundHelix — مقاطع توليدية CC0 لقسم الأصبيزة/الضوضاء البيضاء.
 *
 * صدق الواجهة: قسم Discover يعرض موسيقى CC فقط (لا أحدث الأغاني التجارية،
 * لأن ترخيصها لا يسمح). يظهر ذلك بوضوح في الواجهة (بادج Creative Commons).
 */

const OPENVERSE_BASE = "https://api.openverse.org/v1/audio";
const ITUNES_SEARCH = "https://itunes.apple.com/search";
const MP3QURAN_BASE = "https://mp3quran.net/api/quran";
const SOUNDHELIX_FILES = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
];

// ---- Rate limit خادمي لطلبات Openverse الصادرة (الحد المجاني ~20/min) ----
const openverseRate = {
    windowStart: Date.now(),
    count: 0,
    LIMIT: 15, // أقل من الحد المجاني — بهامش أمان
    WINDOW_MS: 60000,
};

function openverseAllowed() {
    const now = Date.now();
    if (now - openverseRate.windowStart >= openverseRate.WINDOW_MS) {
        openverseRate.windowStart = now;
        openverseRate.count = 0;
    }
    return openverseRate.count < openverseRate.LIMIT;
}

function openverseConsume() {
    openverseRate.count += 1;
}

// ---- تخزين مؤقت خادمي (Memory + Redis عبر mainServer cache) ----
// mainServer يستورد cacheGet/cacheSet من هنا؟ لا — mainServer يعرّفها بنفسه
// ويستخدمها مباشرة. هذه الوحدة تمرر دوال الكاش من الخارج (حقن).
let injectedCache = null;
let injectedFetch = null;

function initAudioHub({ cacheGet, cacheSet, fetchImpl }) {
    injectedCache = { cacheGet, cacheSet };
    injectedFetch = fetchImpl;
}

/**
 * fetchJson — prefers Node's native fetch (18+): node-fetch v2 hangs on some
 * Openverse TLS responses (observed 30s+ timeouts where native fetch returns
 * in <1s). Falls back to the injected impl (node-fetch) on old Node.
 */
async function fetchJson(url, opts = {}, timeoutMs = 30000) {
    const useNative = typeof globalThis.fetch === "function";
    const impl = useNative ? globalThis.fetch : injectedFetch;
    if (!impl) throw Object.assign(new Error("no fetch implementation"), { status: 500 });
    const controller = useNative ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const res = await impl(url, {
            headers: { Accept: "application/json" },
            ...(controller ? { signal: controller.signal } : {}),
            ...(useNative ? {} : { timeout: timeoutMs }),
        });
        if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502 });
        return await res.json();
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function ensureInit() {
    if (!injectedCache || !injectedFetch) {
        throw Object.assign(new Error("initAudioHub() must be called before use"), {
            status: 500,
        });
    }
}

// ---- تطبيع نتيجة Openverse إلى الشكل الموحد للواجهة ----
function normalizeOpenverseResult(r) {
    return {
        id: `ov:${r.id}`,
        title: String(r.title || "Untitled").slice(0, 300),
        author: String(r.creator || r.username || "Unknown").slice(0, 120),
        durationSec: Number(r.duration) || 0,
        thumbnail: r.thumbnail ? String(r.thumbnail).slice(0, 1000) : null,
        audioUrl: String(r.url).slice(0, 1000),
        license: {
            code: String(r.license || "").slice(0, 60),
            url: String(r.license_url || "").slice(0, 1000),
        },
        source: String(r.source || "openverse").slice(0, 60),
        foreignLandingUrl: String(r.foreign_landing_url || "").slice(0, 1000),
        provider: String(r.provider || "").slice(0, 60),
    };
}

// ---- قسم Ambient (نقلًا من Focus SoundBoard -> المحرك الموحد) ----
const AMBIENT_TRACKS = [
    { id: "amb:rain", title: "Rain", audioUrl: SOUNDHELIX_FILES[0] },
    { id: "amb:thunder", title: "Thunder", audioUrl: SOUNDHELIX_FILES[1] },
    { id: "amb:forest", title: "Forest", audioUrl: SOUNDHELIX_FILES[2] },
    { id: "amb:birds", title: "Birds", audioUrl: SOUNDHELIX_FILES[3] },
    { id: "amb:waves", title: "Waves", audioUrl: SOUNDHELIX_FILES[4] },
    { id: "amb:fireplace", title: "Fireplace", audioUrl: SOUNDHELIX_FILES[0] },
    { id: "amb:wind", title: "Wind", audioUrl: SOUNDHELIX_FILES[1] },
    { id: "amb:cafe", title: "Café", audioUrl: SOUNDHELIX_FILES[2] },
    { id: "amb:piano", title: "Piano", audioUrl: SOUNDHELIX_FILES[3] },
    { id: "amb:guitar", title: "Guitar", audioUrl: SOUNDHELIX_FILES[4] },
    { id: "amb:white-noise", title: "White noise", audioUrl: SOUNDHELIX_FILES[0] },
    { id: "amb:deep-focus", title: "Deep focus", audioUrl: SOUNDHELIX_FILES[1] },
];

// ---- قِراء المصحف (mp3quran.net) ----
const QURAN_RECITERS = [
    { id: "qr:mishary", name: "Mishary Al-Afasy", server: "https://server11.mp3quran.net/afasy/", start: 1, end: 114 },
    { id: "qr:maher", name: "Maher Al-Muaiqly", server: "https://server11.mp3quran.net/maher/", start: 1, end: 114 },
    { id: "qr:abdulbasit", name: "Abdul Basit Murattal", server: "https://server11.mp3quran.net/abdulbasit/", start: 1, end: 114 },
    { id: "qr:hudhaify", name: "Ali Al-Hudhaify", server: "https://server11.mp3quran.net/hudhaify/", start: 1, end: 114 },
];

const pad3 = (n) => String(n).padStart(3, "0");

function quranSurahTrack(reciterId, surah) {
    const r = QURAN_RECITERS.find((x) => x.id === reciterId);
    if (!r || surah < r.start || surah > r.end) return null;
    return {
        id: `quran:${r.id}:${pad3(surah)}`,
        title: `${r.name} — Surah ${surah}`,
        audioUrl: `${r.server}${pad3(surah)}.mp3`,
        reciter: r.name,
        surah,
        thumbnail: null,
        durationSec: 0,
        license: { code: "quran", url: "https://mp3quran.net" },
    };
}

// ---- iTunes Search API (metadata only) ----
// Legal note: iTunes Search API is free, no key needed, and Apple permits
// its use for locating content — but the previewUrl it returns is a 30s
// PREVIEW clip (audio/x-m4a), NOT the full commercial track. We use it for
// REAL song/artist/album/cover metadata + a legal 30-second preview.
// Rate limit ~20 req/min per IP (Apple-documented) — cached + rate-limited.
const itunesRate = {
    windowStart: Date.now(),
    count: 0,
    LIMIT: 15, // under the ~20/min free limit — with a safety margin
    WINDOW_MS: 60000,
};

function itunesAllowed() {
    const now = Date.now();
    if (now - itunesRate.windowStart >= itunesRate.WINDOW_MS) {
        itunesRate.windowStart = now;
        itunesRate.count = 0;
    }
    return itunesRate.count < itunesRate.LIMIT;
}

function itunesConsume() {
    itunesRate.count += 1;
}

function normalizeItunesResult(r) {
    const artwork = String(r.artworkUrl100 || r.artworkUrl60 || "")
        .replace(/\d+x\d+bb/, "300x300bb") || null;
    return {
        id: `it:${r.trackId}`,
        title: String(r.trackName || "Untitled").slice(0, 300),
        author: String(r.artistName || "Unknown").slice(0, 120),
        album: String(r.collectionName || "").slice(0, 200),
        genre: String(r.primaryGenreName || "").slice(0, 60),
        durationSec: Math.round((Number(r.trackTimeMillis) || 0) / 1000),
        thumbnail: artwork,
        audioUrl: String(r.previewUrl || "").slice(0, 1000) || null, // 30s legal preview
        license: {
            code: "apple-preview",
            url: String(r.trackViewUrl || "").slice(0, 1000),
        },
        source: "itunes",
        foreignLandingUrl: String(r.trackViewUrl || "").slice(0, 1000),
        provider: "itunes",
    };
}

async function searchItunes({ query, page = 1, limit = 20 }) {
    if (!query || !String(query).trim()) {
        throw Object.assign(new Error("MISSING_PARAMS"), { status: 400 });
    }
    const trimmed = String(query).trim().slice(0, 120);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    // iTunes search has no pagination — page>1 is emulated by slicing (results
    // cap 200). Page 1 keeps 0..limit, page N keeps (N-1)*limit..N*limit.
    const safePage = Math.min(Math.max(1, Number(page) || 1), 5);
    const fetchCount = safePage * safeLimit;
    const cacheKey = `audiohub:itunes:${trimmed.toLowerCase()}:${safePage}:${safeLimit}`;

    const cached = await injectedCache.cacheGet(cacheKey);
    if (cached) return { items: cached, cached: true, rateLimited: false };

    if (!itunesAllowed()) return { items: [], cached: false, rateLimited: true };
    itunesConsume();

    const params = new URLSearchParams({
        term: trimmed,
        entity: "song",
        media: "music",
        limit: String(Math.min(fetchCount, 200)),
    });

    try {
        const data = await fetchJson(`${ITUNES_SEARCH}?${params}`, {}, 15000);
        const all = (data.results || []).map(normalizeItunesResult).filter((x) => x.audioUrl);
        const items = all.slice((safePage - 1) * safeLimit, safePage * safeLimit);
        await injectedCache.cacheSet(cacheKey, items, 300);
        return { items, cached: false, rateLimited: false, total: all.length };
    } catch (err) {
        if (err.status) throw err;
        throw Object.assign(new Error(`iTunes request failed: ${err.message}`), { status: 502 });
    }
}

// ---- Openverse search مع الكاش + الحد ----
async function searchOpenverse({ query, section = "music", page = 1, limit = 20 }) {
    ensureInit();
    if (!query || !String(query).trim()) {
        throw Object.assign(new Error("MISSING_PARAMS"), { status: 400 });
    }

    const trimmed = String(query).trim().slice(0, 120);
    const safePage = Math.min(Math.max(1, Number(page) || 1), 5);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const cacheKey = `audiohub:search:${section}:${trimmed.toLowerCase()}:${safePage}:${safeLimit}`;

    // 1) الكاش أولًا
    const cached = await injectedCache.cacheGet(cacheKey);
    if (cached) return { items: cached, cached: true, rateLimited: false };

    // 2) الحد الخادمي
    if (!openverseAllowed()) {
        return { items: [], cached: false, rateLimited: true };
    }

    // 3) الطلب الفعلي
    openverseConsume();
    const params = new URLSearchParams({
        q: trimmed,
        page: safePage,
        page_size: safeLimit,
        filter_dead: "true", // ضمان روابط حية فقط
        filter_category: "music",
    });

    try {
        const data = await fetchJson(`${OPENVERSE_BASE}?${params}`, {}, 30000); // Openverse can be slow
        const items = (data.results || []).map(normalizeOpenverseResult).filter((x) => x.audioUrl);

        // 4) تخزين الكاش (دقيقتين)
        await injectedCache.cacheSet(cacheKey, items, 120);

        return { items, cached: false, rateLimited: false };
    } catch (err) {
        if (err.status) throw err;
        throw Object.assign(new Error(`Openverse request failed: ${err.message}`), { status: 502 });
    }
}

module.exports = {
    initAudioHub,
    searchOpenverse,
    searchItunes,
    AMBIENT_TRACKS,
    QURAN_RECITERS,
    quranSurahTrack,
    SOUNDHELIX_FILES,
};
