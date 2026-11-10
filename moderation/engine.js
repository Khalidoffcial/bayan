/**
 * Bayan — multilingual moderation engine (detector only; no enforcement here).
 *
 * Design rules:
 *  - Dictionaries come from the DB (control_moderation/dictionary). Nothing is
 *    hardcoded in the frontend; this module holds only normalization logic.
 *  - Context guards: educational / medical / journalistic / quotation /
 *    anti-abuse phrasing downgrades a match instead of escalating it.
 *  - Returns evidence only. Creating cases / hiding content / restricting
 *    accounts is the workflow module's job, governed by config policy.
 */
"use strict";

// ── Language support registry ──────────────────────────────────────────────
// Adding a language = add an entry here + dictionary entries in the DB.
// No core logic changes needed.
const LANGUAGES = {
    ar: { name: "Arabic", script: "arabic", stop: ["في", "من", "على", "هذا", "هذه", "التي", "الذي", "أن", "إن", "كان", "مع", "عن", "إلى", "ما", "لا", "هو", "هي"] },
    en: { name: "English", script: "latin", stop: ["the", "and", "is", "are", "was", "this", "that", "with", "for", "not", "you", "have", "from"] },
    fr: { name: "French", script: "latin", stop: ["le", "la", "les", "des", "est", "une", "que", "pour", "dans", "avec", "pas", "vous"] },
    es: { name: "Spanish", script: "latin", stop: ["el", "la", "los", "las", "es", "una", "para", "con", "por", "que", "pero", "como"] },
    de: { name: "German", script: "latin", stop: ["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "mit", "für", "auch", "sich"] },
    pt: { name: "Portuguese", script: "latin", stop: ["o", "a", "os", "as", "é", "uma", "para", "com", "não", "mas", "como", "por"] },
    it: { name: "Italian", script: "latin", stop: ["il", "lo", "la", "che", "di", "per", "con", "non", "una", "sono", "come", "anche"] },
    tr: { name: "Turkish", script: "latin", stop: ["bir", "ve", "bu", "için", "ile", "olarak", "değil", "çok", "ama", "gibi"] },
    ru: { name: "Russian", script: "cyrillic", stop: ["и", "в", "не", "на", "что", "это", "как", "но", "по", "для", "его", "она"] },
    zh: { name: "Chinese", script: "han", stop: ["的", "是", "了", "在", "和", "不", "这", "有", "我", "他"] },
    ja: { name: "Japanese", script: "japanese", stop: ["の", "は", "に", "を", "た", "と", "し", "で", "も", "です"] },
    ko: { name: "Korean", script: "hangul", stop: ["이", "그", "의", "는", "을", "에", "와", "하다", "입니다", "하지만"] },
    hi: { name: "Hindi", script: "devanagari", stop: ["है", "और", "का", "में", "की", "यह", "से", "हैं", "को", "पर"] },
};

/** Script-based + stopword heuristic language detection. Best-effort only. */
function detectLanguage(text) {
    const s = String(text || "");
    if (/[\u0600-\u06FF]/.test(s)) return "ar";
    if (/[\u3040-\u30FF]/.test(s)) return "ja";
    if (/[\uAC00-\uD7AF]/.test(s)) return "ko";
    if (/[\u4E00-\u9FFF]/.test(s)) return "zh";
    if (/[\u0900-\u097F]/.test(s)) return "hi";
    if (/[\u0400-\u04FF]/.test(s)) return "ru";
    const words = s.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 1);
    if (!words.length) return "unknown";
    let best = "en", bestScore = 0;
    for (const [code, meta] of Object.entries(LANGUAGES)) {
        if (meta.script !== "latin") continue;
        const score = words.filter((w) => meta.stop.includes(w)).length;
        if (score > bestScore) { bestScore = score; best = code; }
    }
    return best;
}

// ── Normalization ──────────────────────────────────────────────────────────
const AR_DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g; // harakat + dagger alif + tatweel
const LEET = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
    "@": "a", "$": "s", "!": "i", "|": "i", "+": "t", "€": "e", "£": "l"
};

/** Base fold: unicode NFKC-ish cleanup, lowercase, unify look-alikes. */
function baseNormalize(text) {
    let s = String(text || "");
    s = s.normalize("NFKC").toLowerCase();
    // zero-width & soft hyphen are classic evasion characters
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g, "");
    for (const [k, v] of Object.entries(LEET)) s = s.split(k).join(v);
    return s;
}

/** Arabic folding: strip diacritics/tatweel, hamza/alef/ya/ta-marbuta variants. */
function normalizeArabic(s) {
    return s
        .replace(AR_DIACRITICS, "")
        .replace(/[أإآٱ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
        .replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/گ/g, "ك").replace(/پ/g, "ب")
        .replace(/[چ]/g, "ج").replace(/[ژ]/g, "ز").replace(/[ڤ]/g, "ف");
}

// Collapse repeated chars to one — used ONLY for filter matching, so that
// "baaadwooord" compares equal to "badword". Never mutates stored content.
function collapseRepeats(s) { return s.replace(/(.)\1+/g, "$1"); }
function squash(s) { return s.replace(/[^\p{L}\p{N}]+/gu, ""); }          // strips spaces/punct

/** Produces every comparable variant of the input used for matching. */
function variants(text) {
    const pre = baseNormalize(text);
    return {
        base: normalizeArabic(pre),
        collapsed: collapseRepeats(normalizeArabic(pre)),
        squashed: squash(normalizeArabic(pre)),
    };
}

// ── Context guards (downgrade, never upgrade) ──────────────────────────────
// Phrases that usually indicate legitimate discussion/education/reporting.
const CONTEXT_GUARDS = [
    // English
    "education", "educational", "awareness", "medical", "medicine", "doctor",
    "study", "research", "journalism", "report", "documentation", "definition",
    "quote", "cited", "according to", "encyclopedia", "wikipedia",
    "against harassment", "stop abuse", "anti-abuse", "warning about",
    "psychology", "law", "legal", "history of", "victim support",
    // Arabic
    "توعوي", "تعليمي", "طبي", "طب", "دراسة", "بحث", "صحفي", "تقرير",
    "تعريف", "اقتباس", "بحسب", "موسوعة", "ضد التحرش", "ضد التنمر",
    "وقف العنف", "دعم الضحايا", "الوقاية", "نصائح",
];

function guardHits(text) {
    const folded = variants(text).base;
    const found = [];
    for (const g of CONTEXT_GUARDS) {
        const gg = variants(g).base;
        let idx = folded.indexOf(gg);
        while (idx !== -1) { found.push([idx, idx + gg.length]); idx = folded.indexOf(gg, idx + 1); }
    }
    return found;
}
function positionGuarded(pos, len, guards) {
    const a = pos, b = pos + len;
    return guards.some(([gs, ge]) => !(b < gs - 40 || a > ge + 40)); // ±40 char window
}

// ── Matching ───────────────────────────────────────────────────────────────
/** Build a matcher index from dictionary rows (DB-backed). */
function buildIndex(entries) {
    const idx = { word: [], phrase: [], squashed: [] };
    for (const e of entries || []) {
        if (e.enabled === false) continue;
        const rec = {
            id: e.id || null,
            term: String(e.term || ""),
            lang: e.lang || "any",
            categoryId: e.categoryId || "custom",
            severity: Number(e.severity) || 2,
            match: e.match || (String(e.term || "").includes(" ") ? "phrase" : "word"),
        };
        if (!rec.term) continue;
        const norm = variants(rec.term);
        rec.norm = collapseRepeats(norm.base); // term also repeat-collapsed
        rec.squash = norm.squashed;
        if (rec.match === "phrase") idx.phrase.push(rec);
        else if (rec.match === "squashed") idx.squashed.push(rec);
        else { idx.word.push(rec); if (rec.match === "exact") idx.squashed.push(rec); }
    }
    return idx;
}

/** Scan raw text. Returns detection evidence — never takes actions itself. */
function scan(text, { entries, langHint, contextGuards = true } = {}) {
    if (!text || typeof text !== "string") {
        return { language: langHint || "unknown", matches: [], maxSeverity: 0, categories: {}, contextGuarded: 0 };
    }
    const language = langHint || detectLanguage(text);
    const idx = buildIndex(entries || []);
    const vv = variants(text);
    const guards = contextGuards ? guardHits(text) : [];
    const out = [];

    const consider = (m) => {
        // Script-level language scoping: an Arabic term can't hit English text,
        // but latin-script codes tolerate heuristic misdetection (pt/en…).
        const el = LANGUAGES[m.entry.lang], dl = LANGUAGES[language];
        const unknownLang = language === "unknown";
        if (!unknownLang && m.entry.lang !== "any" && m.entry.lang !== language &&
            !(el && dl && el.script === dl.script)) return;
        if (guards.length && positionGuarded(m.pos, m.len, guards)) m.guarded = true;
        out.push(m);
    };

    // word / exact: boundary-anchored against folded + collapsed variants
    for (const entry of idx.word) {
        for (const variant of [vv.base, vv.collapsed]) {
            let i = variant.indexOf(entry.norm);
            while (i !== -1) {
                const before = i > 0 ? variant[i - 1] : " ";
                const after = variant[i + entry.norm.length] || " ";
                if (!/\p{L}/u.test(before) && !/\p{L}/u.test(after)) {
                    consider({ entry, pos: i, len: entry.norm.length, method: "dictionary" });
                }
                i = variant.indexOf(entry.norm, i + 1);
            }
        }
    }
    // squashed: catches spacing/punctuation obfuscation ("b a d w o r d")
    for (const entry of idx.squashed) {
        if (entry.squash.length < 4) continue; // too short — huge FP risk
        let i = vv.squashed.indexOf(entry.squash);
        while (i !== -1) {
            consider({ entry, pos: i, len: entry.squash.length, method: "obfuscation-squash" });
            i = vv.squashed.indexOf(entry.squash, i + 1);
        }
    }
    // phrase: substring on folded text (multi-word patterns) + squashed form
    // (collapsed-phrase covers "kill  you" double-spacing evasions)
    for (const entry of idx.phrase) {
        let i = vv.base.indexOf(entry.norm);
        if (i === -1 && entry.squash.length >= 4) {
            i = vv.squashed.indexOf(entry.squash);
            while (i !== -1) {
                consider({ entry, pos: i, len: entry.squash.length, method: "obfuscation-squash" });
                i = vv.squashed.indexOf(entry.squash, i + 1);
            }
            continue;
        }
        while (i !== -1) {
            consider({ entry, pos: i, len: entry.norm.length, method: "dictionary" });
            i = vv.base.indexOf(entry.norm, i + 1);
        }
    }

    // Deduplicate per entry id, keep lowest position; merge guarded status.
    const seen = new Map();
    const final = [];
    for (const m of out) {
        const key = (m.entry.id || m.entry.term) + "@" + m.method;
        const prev = seen.get(key);
        if (!prev) { seen.set(key, m); final.push(m); continue; }
        if (m.pos < prev.pos) prev.pos = m.pos;
        if (m.guarded) prev.guarded = true;
    }
    let guardedCount = 0;
    const categories = {};
    let maxSeverity = 0;
    for (const m of final) {
        if (m.guarded) {
            guardedCount++;
            m.method += "+context-guard";
            m.effectiveSeverity = Math.max(1, m.entry.severity - 2);
        } else {
            m.effectiveSeverity = m.entry.severity;
        }
        categories[m.entry.categoryId] = Math.max(categories[m.entry.categoryId] || 0, m.effectiveSeverity);
        if (!m.guarded || m.entry.severity >= 5) maxSeverity = Math.max(maxSeverity, m.effectiveSeverity);
    }
    return { language, matches: final, maxSeverity, categories, contextGuarded: guardedCount };
}

module.exports = { LANGUAGES, detectLanguage, baseNormalize, normalizeArabic, variants, buildIndex, scan, CONTEXT_GUARDS };
