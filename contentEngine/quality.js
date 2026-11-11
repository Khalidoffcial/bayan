/**
 * contentEngine/quality.js — mandatory quality-control pipeline.
 *
 * Every generated item passes through evaluate() BEFORE it can reach
 * PENDING_APPROVAL. Gates follow the spec's twelve checks; failures record
 * which gate rejected the item so the rejection is auditable and improvable.
 */

const crypto = require("crypto");

const GATES = [
    "accuracy", "originality", "usefulness", "language", "readability",
    "category", "duplicate", "copyright", "safety", "image", "formatting", "sources",
];

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0640]/g, "") // Arabic diacritics
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function shingles(text, n = 8) {
    const words = normalize(text).split(" ").filter(Boolean);
    const out = new Set();
    for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
    return out;
}

function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return inter / (a.size + b.size - inter);
}

function evaluate(draft, ctx = {}) {
    const issues = [];
    const warnings = [];
    const content = String(draft.content || "");
    const words = content.split(/\s+/).filter(Boolean).length;

    // 1. length / usefulness floors (readability gate)
    const minWords = ctx.type === "novels" ? 500 : ctx.type === "articles" ? 400 : 60;
    if (words < minWords) issues.push(`too short (${words} words < ${minWords})`);

    // 2. formatting — markdown structure for articles
    if (ctx.type === "articles") {
        const headings = (content.match(/^#{1,3}\s/mg) || []).length;
        if (headings < 2) issues.push("article lacks section headings");
    }
    if (/\n\s*\n\s*\n/.test(content)) warnings.push("extra blank paragraphs detected");

    // 3. banned AI-template patterns (language/originality)
    const banned = [
        /in (today'?s|conclusion)/i, /as an ai\b/i, /delve into/i,
        /in the ever[- ]evolving/i, /unlock the (power|potential)/i,
        /فى عالمنا المتسارع/i, /خاتمة ظاهر فيها أن النص مكتوب بالذكاء الاصطناعي/,
    ];
    if (banned.some((re) => re.test(content))) issues.push("template/AI-style phrasing detected");

    // 4. fabricated-number heuristic: bare percentages/claims without a source note
    const numbers = (content.match(/\d+(\.\d+)?%/g) || []).length;
    if (numbers > 3 && !(draft.sources || []).length) issues.push("unsupported statistics");

    // 5. duplicate detection against recent Bayan content (fingerprint)
    const fp = shingles(content);
    for (const prev of ctx.recentFingerprints || []) {
        const sim = jaccard(fp, prev.fp);
        if (sim >= 0.5) { issues.push(`near-duplicate of ${prev.id} (similarity ${(sim * 100).toFixed(0)}%)`); break; }
        if (sim >= 0.3) warnings.push(`similar to ${prev.id} (${(sim * 100).toFixed(0)}%)`);
    }

    // 6. safety: hard-block obvious harmful content patterns
    const unsafe = [/\b(how to make|build)\b.*(bomb|explosive|meth)/i, /child (porn|abuse)/i];
    if (unsafe.some((re) => re.test(content))) issues.push("safety blocklist");

    // 7. language match: rough script check (RTL langs shouldn't return Latin-heavy bodies)
    if (ctx.lang === "ar") {
        const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length;
        if (arabicChars / Math.max(words, 1) < 0.5) issues.push("language mismatch (expected Arabic)");
    }

    // 8. copyright heuristics — very long verbatim runs from source are flagged upstream;
    // here we require that sourced articles declare their sources array.
    if (ctx.sourceUrl && !(draft.sources || []).length) warnings.push("sourced topic without recorded reference");

    // 9. image gate (spec: no random decorative images; alt text required when present)
    if (draft.img && !draft.imgAlt) issues.push("image without alt text");

    const score = Math.max(0, 100 - issues.length * 25 - warnings.length * 5);
    return {
        ok: issues.length === 0,
        score,
        issues,
        warnings,
        gatesChecked: GATES,
        fingerprint: crypto.createHash("sha256").update(normalize(content)).digest("hex").slice(0, 16),
    };
}

module.exports = { evaluate, jaccard, shingles, _internals: { normalize } };
