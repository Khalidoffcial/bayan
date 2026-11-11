/**
 * contentEngine/generator.js — original content generation via local Ollama.
 *
 * Uses the LOCAL Ollama HTTP API (http://localhost:11434) — no external
 * content APIs, no data leaves the machine. If Ollama is unavailable the
 * generator reports `modelUnavailable` and the job goes to RETRY_WAITING
 * (recoverable when the device/model returns) rather than failing forever.
 *
 * Anti-template rules are baked into every prompt: no generic AI intros,
 * no "in conclusion" endings, no keyword stuffing, no invented statistics,
 * no fake citations.
 */

const config = require("./config");
const fetch = require("node-fetch");

const STYLE_BRIEF = {
    en: "Write in clear modern English. Direct sentences. No filler.",
    ar: "اكتب بالفصحى الواضحة والحديثة. جمل مباشرة. بلا حشو وبلا ترجمة حرفية.",
    fr: "Écris en français clair et moderne. Phrases directes.",
    es: "Escribe en español claro y directo.",
    de: "Schreibe in klarem, direkten Deutsch.",
    zh: "用清晰现代的中文写作。",
};

const COMMON_RULES = `
STRICT RULES:
- Original content only. Never reproduce or closely paraphrase source text; the source is TOPIC EVIDENCE only.
- Never invent statistics, dates, quotes, or citations. If a fact needs a source you lack, say what is uncertain instead.
- No "In conclusion", no "In today's fast-paced world", no meta commentary about being an AI.
- Every section must carry real information; no empty filler paragraphs.
- Keep terminology precise; explain jargon in one sentence the first time.`;

function buildArticlePrompt({ topic, persona, vertical, lang, source }) {
    const brief = STYLE_BRIEF[lang] || STYLE_BRIEF.en;
    return `${brief}
You are "${persona.displayName}" — a transparent EDITORIAL desk of Bayan Space (say nothing about being automated; the platform labels accounts itself). Specialization: ${vertical.label}.
${COMMON_RULES}

TOPIC: ${topic.title}
${source?.sourceUrl ? `Reference (metadata only): ${source.sourceUrl}\nEvidence note: ${source.evidence || ""}` : "(no external reference — treat as evergreen explainer)"}

Write an original article of 600–900 words in ${lang}:
1. Title: specific and honest, no clickbait.
2. A 2-sentence lead that states what the reader will learn.
3. 3–5 sections with informative subheadings (##).
4. Concrete examples or steps where possible.
5. End with a practical takeaway — NOT a summary paragraph.

Return JSON only: {"title": "...", "descrip": "<=160 char description", "content": "markdown body"}`;
}

function buildPostPrompt({ topic, persona, vertical, lang }) {
    const brief = STYLE_BRIEF[lang] || STYLE_BRIEF.en;
    return `${brief}
You are "${persona.displayName}", an editorial desk of Bayan Space.
${COMMON_RULES}

Write ONE community discussion post (80–160 words) in ${lang} about: ${topic.title}
It must invite genuine participation: a specific question, context in two sentences, and what would make answers useful. No fake opinions of "other users".

Return JSON only: {"title": "", "content": "the post text"}`;
}

function buildNovelPrompt({ persona, lang, genreLabel, chapterInfo }) {
    const brief = STYLE_BRIEF[lang] || STYLE_BRIEF.en;
    return `${brief}
You are "${persona.displayName}", the fiction wing of Bayan Space. All plots, characters, dialogue and settings must be ORIGINAL — do not imitate any living author's distinctive style and never retell existing novels.
${COMMON_RULES}

Write ${chapterInfo ? `chapter ${chapterInfo.number} of the serial "${chapterInfo.seriesTitle}" (established so far: ${chapterInfo.synopsis})` : `a complete short story`} in ${lang}, genre: ${genreLabel}.
Requirements: a named protagonist with one clear want; a concrete obstacle; sensory grounding; an ending that resolves THIS scene while opening the larger arc. 900–1400 words.

Return JSON only: {"title": "", "descrip": "<=160 chars", "content": "the prose", "characters": [{"name":"","role":""}], "timeline": "1-2 sentences of where this sits"}`;
}

// ── Ollama client ───────────────────────────────────────────────────────────

async function ollamaGenerate(prompt, { json = true } = {}) {
    const { url, model, temperature, numCtx, numPredictMax, requestTimeoutMs } = config.ollama;
    const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: requestTimeoutMs,
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            format: json ? "json" : undefined,
            options: { temperature, num_ctx: numCtx, num_predict: numPredictMax },
        }),
    });
    if (!res.ok) {
        const err = new Error(`Ollama HTTP ${res.status}`);
        err.code = res.status === 404 ? "MODEL_UNAVAILABLE" : "OLLAMA_ERROR";
        throw err;
    }
    const data = await res.json();
    const text = (data.response || "").trim();
    if (!text) { const e = new Error("empty generation"); e.code = "EMPTY_GENERATION"; throw e; }
    try { return JSON.parse(text); } catch { return { title: "", descrip: "", content: text }; }
}

async function modelStatus() {
    try {
        const res = await fetch(`${config.ollama.url.replace(/\/$/, "")}/api/tags`, { timeout: 5000 });
        if (!res.ok) return { available: false, reason: `HTTP ${res.status}` };
        const data = await res.json();
        const models = (data.models || []).map((m) => m.name);
        const wanted = config.ollama.model;
        return {
            available: models.some((m) => m.startsWith(wanted)),
            models,
            wanted,
        };
    } catch (e) {
        return { available: false, reason: e.message };
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

async function generateArticle(ctx) { return ollamaGenerate(buildArticlePrompt(ctx)); }
async function generatePost(ctx) { return ollamaGenerate(buildPostPrompt(ctx)); }
async function generateNovel(ctx) { return ollamaGenerate(buildNovelPrompt(ctx)); }

module.exports = { generateArticle, generatePost, generateNovel, modelStatus, buildArticlePrompt, _internals: { STYLE_BRIEF, COMMON_RULES } };
