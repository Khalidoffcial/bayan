/**
 * quran.service.js — AlQuran Cloud integration (server-side proxy + cache).
 *
 * التزام الدقة:
 *  - النص القرآني يُمرر كما هو من api.alquran.cloud (quran-uthmani) — لا تعديل.
 *  - الترجمات والقراء كما تعيدهم الواجهة الرسمية (editions endpoint).
 *  - لا AI ولا mock — كل byte من المصدر الرسمي.
 *
 * المصادر (مجانية بلا مفتاح):
 *   GET /v1/surah                     → قائمة السور (114)
 *   GET /v1/surah/{n}/quran-uthmani   → نص السورة آية-آية
 *   GET /v1/surah/{n}/{edition}       → ترجمة أو صوت per-ayah
 *   GET /v1/edition                   → الترجمات والقراء المتاحون
 *   CDN: cdn.islamic.network/quran/audio/{bitrate}/{reciter}/{ayahNo}.mp3
 */
const AQ_BASE = "https://api.alquran.cloud/v1";

let injectedCache = { cacheGet: async () => null, cacheSet: async () => { } };
function initQuran({ cacheGet, cacheSet }) {
    if (cacheGet) injectedCache.cacheGet = cacheGet;
    if (cacheSet) injectedCache.cacheSet = cacheSet;
}

async function fetchJson(url, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: res.status === 404 ? 404 : 502 });
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

/** قائمة السور — شبه ثابتة، cache يوم كامل. */
async function getSurahs() {
    const cached = await injectedCache.cacheGet("quran:surahs");
    if (cached) return { surahs: cached, cached: true };
    const data = await fetchJson(`${AQ_BASE}/surah`);
    const surahs = (data.data || []).map((s) => ({
        number: s.number,
        name: s.name,              // الاسم العربي (سُورَةُ الفَاتِحَة)
        englishName: s.englishName,
        englishNameTranslation: s.englishNameTranslation,
        numberOfAyahs: s.numberOfAyahs,
        revelationType: s.revelationType, // Meccan | Medinan
    }));
    await injectedCache.cacheSet("quran:surahs", surahs, 86400);
    return { surahs, cached: false };
}

/** الترجمات المتاحة — نحصر بلغات mainstream موثوقة من editions الرسمية. */
const TRUSTED_TRANSLATIONS = ["en.sahih", "en.pickthall", "en.yusufali", "fr.hamidullah", "es.cortes", "ur.jalandhry", "id.indonesian", "tr.diyanet", "ru.kuliev", "de.aburida"];
async function getTranslations() {
    const cached = await injectedCache.cacheGet("quran:translations");
    if (cached) return { translations: cached, cached: true };
    const data = await fetchJson(`${AQ_BASE}/edition?format=text&type=translation`);
    const translations = (data.data || [])
        .filter((e) => TRUSTED_TRANSLATIONS.includes(e.identifier))
        .map((e) => ({ identifier: e.identifier, language: e.language, name: e.englishName || e.name, translator: e.author || "" }));
    await injectedCache.cacheSet("quran:translations", translations, 86400);
    return { translations, cached: false };
}

/** القراء المتاحون — كما تعيدهم الواجهة الرسمية، مع معدل البتات المدعوم. */
async function getReciters() {
    const cached = await injectedCache.cacheGet("quran:reciters");
    if (cached) return { reciters: cached, cached: true };
    const data = await fetchJson(`${AQ_BASE}/edition?format=audio`);
    const reciters = (data.data || []).map((e) => ({
        identifier: e.identifier,
        name: e.englishName || e.name,
        arabicName: e.name || "",
        language: e.language,
        bitrates: Array.isArray(e.formats) ? e.formats.map(Number) : [128],
    }));
    await injectedCache.cacheSet("quran:reciters", reciters, 86400);
    return { reciters, cached: false };
}

function normalizeAyah(a) {
    return {
        number: a.numberInSurah,
        numberInQuran: a.number,
        text: a.text, // النص العثماني كما هو — لا تعديل
        page: a.page,
        juz: a.juz,
        sajda: a.sajda ? (a.sajda.recommended ? "recommended" : "obligatory") : null,
        // audio fields appear when a reciter edition was requested
        audioUrl: a.audio || null,
        audioSecondary: Array.isArray(a.audioSecondary) ? a.audioSecondary : [],
    };
}

/**
 * getSurah — سورة كاملة: عربي (عثماني) + ترجمة واحدة اختيارية + صوت قارئ واحد.
 * ترجِع الآيات مع النص العربي ومصفوفة {translation, audio} حسب الطلب.
 * البيانات تُتحقق اكتمالها: عدد الآيات يطابق numberOfAyahs وإلا نرمي DATA_INCOMPLETE.
 */
async function getSurah(number, { translation, reciter, bitrate = 128 } = {}) {
    // التحقق الصريح — رقم خارج 1..114 خطأ 404 وليس "أقرب سورة"
    const n = Number(number);
    if (!Number.isInteger(n) || n < 1 || n > 114) {
        throw Object.assign(new Error("INVALID_SURAH"), { status: 404 });
    }
    const variants = ["quran-uthmani"];
    if (translation && TRUSTED_TRANSLATIONS.includes(String(translation))) variants.push(String(translation));
    if (reciter) variants.push(String(reciter));

    // cache per exact variant combo (24h — النص ثابت إطلاقًا)
    const cacheKey = `quran:surah:${n}:${variants.join("|")}:${bitrate}`;
    const cached = await injectedCache.cacheGet(cacheKey);
    if (cached) return { surah: cached, cached: true };

    const results = await Promise.all(variants.map((v) => fetchJson(`${AQ_BASE}/surah/${n}/${encodeURIComponent(v)}`)));
    const base = results[0].data;
    const translationData = variants.includes(translation) ? results[variants.indexOf(translation)].data : null;
    const audioData = reciter ? results[results.length - 1].data : null;

    if (!base?.ayahs?.length) throw Object.assign(new Error("DATA_INCOMPLETE"), { status: 502 });

    const ayahs = base.ayahs.map((a, i) => {
        const normalized = normalizeAyah(a);
        if (translationData) normalized.translation = translationData.ayahs?.[i]?.text || null;
        if (audioData) {
            const rec = audioData.ayahs?.[i];
            if (rec?.audio) {
                normalized.audioUrl = rec.audio;
                normalized.audioSecondary = Array.isArray(rec.audioSecondary) ? rec.audioSecondary : [];
            }
        }
        return normalized;
    });

    // اكتمال البيانات — لا نعرض نصًا ناقصًا أبدًا
    if (ayahs.length !== base.numberOfAyahs) {
        throw Object.assign(new Error("DATA_INCOMPLETE"), { status: 502 });
    }

    const surah = {
        number: base.number,
        name: base.name,
        englishName: base.englishName,
        englishNameTranslation: base.englishNameTranslation,
        numberOfAyahs: base.numberOfAyahs,
        revelationType: base.revelationType,
        bismillahPrefix: base.bismillah ? "" : null,
        ayahs,
        // مصدر البيانات يُعرض في الواجهة (المصداقية)
        source: "api.alquran.cloud (quran-uthmani)",
        translationIdentifier: translation || null,
        reciterIdentifier: reciter || null,
        audioBitrate: reciter ? bitrate : null,
    };
    await injectedCache.cacheSet(cacheKey, surah, 86400);
    return { surah, cached: false };
}

module.exports = { initQuran, getSurahs, getTranslations, getReciters, getSurah, TRUSTED_TRANSLATIONS };
