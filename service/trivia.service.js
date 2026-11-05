/**
 * trivia.service.js — Open Trivia DB integration (server-side proxy).
 *
 * لماذا proxy خادمي؟
 *  1. cache مركزي للتصنيفات + token الجلسة (تقليل الضغط على opentdb —
 *     سياستهم تمنع إعادة الطلبات المكثفة).
 *  2. حماية من التلاعب: الأجوبة الصحيحة تعاد للعميل بعد shuffle كي يعرض
 *     التقدّم فورًا — لكن scoring النهائي يُحسب على الخادم من مرجع الجلسة.
 *
 * المصدر: https://opentdb.com/api_config.php — مجاني بلا مفتاح.
 */
const OPEN_TDB = "https://opentdb.com";
const CATEGORY_TTL = 24 * 3600; // التصنيفات شبه ثابتة — يوم كامل

let injectedCache = { cacheGet: async () => null, cacheSet: async () => { } };
function initTrivia({ cacheGet, cacheSet }) {
    if (cacheGet) injectedCache.cacheGet = cacheGet;
    if (cacheSet) injectedCache.cacheSet = cacheSet;
}

async function fetchJson(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (res.status === 429) {
            // opentdb rate limit (response_code 5 upstream) — retry once after a
            // short backoff instead of failing the user's session outright
            await new Promise((r) => setTimeout(r, 2500));
            const retry = await fetch(url, { headers: { Accept: "application/json" } });
            if (!retry.ok) throw Object.assign(new Error("RATE_LIMITED"), { status: 429, code: "RATE_LIMITED" });
            return await retry.json();
        }
        if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502 });
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// opentdb يعيد HTML entities (" &#039; ...) — نفكها على الخادم مرة واحدة
function decodeEntities(s) {
    if (typeof s !== "string") return s;
    return s
        .replace(/"|&#34;|&ldquo;|&rdquo;/g, '"')
        .replace(/'|&#39;|&lsquo;|&rsquo;/g, "'")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&hellip;/g, "…")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** fetch a session token (opentdb token prevents repeating recent questions) */
async function getToken() {
    const data = await fetchJson(`${OPEN_TDB}/api_token.php?command=request`);
    if (data.response_code !== 0 || !data.token) {
        throw Object.assign(new Error("TOKEN_UNAVAILABLE"), { status: 502 });
    }
    return data.token;
}

async function getCategories() {
    const cached = await injectedCache.cacheGet("trivia:categories");
    if (cached) return { categories: cached, cached: true };
    const data = await fetchJson(`${OPEN_TDB}/api_category.php`);
    const categories = (data.trivia_categories || []).map((c) => ({
        id: c.id,
        name: decodeEntities(c.name),
    }));
    await injectedCache.cacheSet("trivia:categories", categories, CATEGORY_TTL);
    return { categories, cached: false };
}

// global token pool — one shared token per server lifetime is allowed and
// keeps opentdb request volume minimal; refreshed automatically when exhausted
let sharedToken = null;
let tokenFailedAt = 0;
async function acquireToken() {
    // don't hammer the token endpoint if it keeps failing (backoff 5 min)
    if (tokenFailedAt && Date.now() - tokenFailedAt < 5 * 60 * 1000) return null;
    if (sharedToken) return sharedToken;
    try {
        sharedToken = await getToken();
        return sharedToken;
    } catch {
        tokenFailedAt = Date.now();
        return null; // token optional — API works without it
    }
}
function dropToken() { sharedToken = null; } // response_code 3/4 → refresh next time

const shuffleArr = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/** Normalized question shape sent to the client. */
function normalizeQuestion(q) {
    const options = q.type === "boolean" ? [q.correct_answer, q.incorrect_answers[0]] : [q.correct_answer, ...q.incorrect_answers];
    // shuffle options but keep the correct answer's identity via index map —
    // the client never learns which is correct; server holds the key.
    const shuffled = shuffleArr(options).map(decodeEntities);
    return {
        id: `${q.category}-${q.question.slice(0, 24)}`.replace(/\s+/g, "_"),
        type: q.type, // multiple | boolean
        difficulty: q.difficulty,
        category: decodeEntities(q.category),
        question: decodeEntities(q.question),
        options: shuffled,
    };
}

/**
 * createSession — fetch questions, store the answer key server-side, return
 * sanitized questions + sessionId. The client checks answers via /answer.
 */
async function createSession({ amount = 10, category, difficulty, type }) {
    const n = Math.min(Math.max(5, Number(amount) || 10), 20);
    const params = new URLSearchParams({ amount: String(n) });
    if (category && Number(category) > 0) params.set("category", String(Number(category)));
    if (["easy", "medium", "hard"].includes(difficulty)) params.set("difficulty", difficulty);
    if (["multiple", "boolean"].includes(type)) params.set("type", type);

    const token = await acquireToken();
    if (token) params.set("token", token);

    let data;
    try {
        data = await fetchJson(`${OPEN_TDB}/api.php?${params}`);
    } catch (err) {
        if (err.status) throw err;
        throw Object.assign(new Error("opentdb unreachable"), { status: 502 });
    }

    // 3 = token exhausted → reset once and retry
    if (data.response_code === 3 && token) {
        dropToken();
        const fresh = await acquireToken();
        if (fresh) params.set("token", fresh);
        data = await fetchJson(`${OPEN_TDB}/api.php?${params}`);
    }

    // 1 = no results for this filter; 2 = invalid param; 4 = not enough questions
    if (data.response_code !== 0) {
        const map = { 1: "NO_RESULTS", 2: "INVALID_PARAM", 3: "TOKEN_EMPTY", 4: "NOT_ENOUGH_QUESTIONS", 5: "RATE_LIMITED" };
        const err = Object.assign(new Error(map[data.response_code] || "UPSTREAM_ERROR"), {
            status: data.response_code === 2 ? 400 : data.response_code === 5 ? 429 : 404,
            code: map[data.response_code],
        });
        throw err;
    }

    const questions = (data.results || []).map(normalizeQuestion);
    // server-side answer key (never sent to the client)
    const key = {};
    for (const q of data.results) {
        key[q.question] = decodeEntities(q.correct_answer);
    }

    const sessionId = `tq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { sessionId, questions, key, config: { amount: n, category: Number(category) || null, difficulty: difficulty || null, type: type || null } };
}

/** grade a single answer — the key lives server-side only.
 *  المفتاح مخزّن بالنص الخام (مع HTML entities) بينما العميل يرسل النص
 *  المفكوك — نقارن بعد فك الكيانات على كلا الجانبين. */
function checkAnswer(session, questionText, answer) {
    if (!session || !session.key) return null;
    const decodedQ = decodeEntities(String(questionText || ""));
    let lookupKey = null;
    for (const k of Object.keys(session.key)) {
        if (decodeEntities(k) === decodedQ) { lookupKey = k; break; }
    }
    if (!lookupKey) return null;
    const correct = decodeEntities(session.key[lookupKey]);
    return { correct, isCorrect: decodeEntities(String(answer)) === correct };
}

module.exports = { initTrivia, getCategories, createSession, checkAnswer, decodeEntities };
