/**
 * books/providers/baseProvider.js — Provider contract + shared plumbing.
 *
 * Every book source plugs in as a Provider object with this shape:
 *   id          unique machine name ("gutenberg", "openlibrary", …)
 *   label       human-readable source name
 *   searchable  whether searchBooks supports arbitrary queries
 *   capabilities { pdf, epub, html, embed, borrow, download }
 *   searchBooks(query, filters, pagination) → { items: [Book], count, next }
 *   getBook(providerBookId) → Book | null
 *   getReadingSources(book) → [{ kind, url|contentRef, label, canDownload }]
 *
 * Books are normalized by the central normalizer before leaving this layer —
 * consumers never see provider-specific shapes.
 */

/** fetch JSON with timeout + retry (shared by all providers) */
async function fetchJson(url, { timeoutMs = 20000, retries = 1, headers = {} } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "BayanSpace/1.0 (+https://bayanspace.app)", ...headers }, signal: controller.signal });
            if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502, retryable: true });
            if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: res.status === 404 ? 404 : 502 });
            return await res.json();
        } catch (e) {
            lastErr = e;
            if (!e.retryable || attempt === retries) break;
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); // linear backoff
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
}

/** fetch raw text with timeout (HTML/TXT reading content) */
async function fetchText(url, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers: { "User-Agent": "BayanSpace/1.0 (+https://bayanspace.app)" }, signal: controller.signal });
        if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502 });
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

/** strip HTML tags + entities for plain-text snippets/descriptions */
function stripHtml(html) {
    return String(html || "")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/** require injectable cache; each provider gets { cacheGet, cacheSet } */
function makeCacheHelper(injectedCache, prefix, ttlSeconds) {
    return async (fn, key) => {
        const fullKey = `${prefix}:${key}`;
        if (injectedCache) {
            const hit = await injectedCache.cacheGet(fullKey);
            if (hit) return hit;
        }
        const value = await fn();
        if (injectedCache && value) await injectedCache.cacheSet(fullKey, value, ttlSeconds);
        return value;
    };
}

module.exports = { fetchJson, fetchText, stripHtml, makeCacheHelper };
