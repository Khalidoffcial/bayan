/**
 * books.service (frontend) — data layer for the Books feature.
 * All requests go through the Bayan backend proxy (/books/*) — the browser
 * never hits external book APIs directly (no CORS pain, server-side cache,
 * API keys stay server-side).
 *
 * Backend contract (service/books/registry.js):
 *   GET  /books/search?q&language&yearFrom&yearTo&author&subject&isbn&source&page&sort
 *   GET  /books/:provider/:providerBookId           → { book } (+ readingSources)
 *   GET  /books/:provider/:providerBookId/read      → { format, content }
 *   GET  /books/:provider/:providerBookId/pdf       → streamed PDF (Range)
 *   GET/PUT/DELETE /books/:provider/:providerBookId/progress → reading progress
 */
import { API_BASE_URL } from "../../../constants/apiEndpoints";
import { api } from "../../../services/api.service";

const BOOKS = `${API_BASE_URL}/books`;

/** short client cache (60s) — avoids duplicate requests during re-renders */
const cache = new Map();
const TTL = 60_000;

/** in-flight dedup: identical concurrent requests share one network call */
const inflight = new Map();

async function cachedGet(url) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < TTL) return hit.data;
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP_${r.status}`);
        const data = await r.json();
        cache.set(url, { at: Date.now(), data });
        if (cache.size > 60) cache.delete(cache.keys().next().value);
        return data;
    })().finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
}

/**
 * searchBooks — unified across all providers.
 * query: string | null ; filters: { language, yearFrom, yearTo, author,
 * subject, isbn, sources[] } ; pagination: { page }
 */
export const searchBooks = async ({ q, language, yearFrom, yearTo, author, subject, isbn, sources, page = 1, sort } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q.slice(0, 120));
    if (language) params.set("language", language);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (author) params.set("author", author.slice(0, 60));
    if (subject) params.set("subject", subject.slice(0, 40));
    if (isbn) params.set("isbn", isbn.replace(/[^0-9Xx]/g, "").slice(0, 13));
    if (sources?.length) params.set("source", sources.join(","));
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    const url = `${BOOKS}/search?${params}`;
    try {
        const data = await cachedGet(url);
        if (data.status !== "ok") throw new Error(data.message || "FAILED");
        return { ok: true, items: data.items || [], count: data.count, next: data.next, errors: data.errors || [] };
    } catch (e) {
        return { ok: false, items: [], error: e.message };
    }
};

/** book details — provider + providerBookId explicit */
export const getBook = async (provider, providerBookId) => {
    try {
        const data = await cachedGet(`${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}`);
        if (data.status !== "ok") throw new Error(data.message || "FAILED");
        return { ok: true, book: data.book };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

/** in-site reading content (HTML/plain text — sanitized before render) */
export const getBookReadContent = async (provider, providerBookId) => {
    try {
        const r = await fetch(`${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/read`);
        const data = await r.json();
        if (data.status !== "ok") throw new Error(data.message || "FAILED");
        return { ok: true, format: data.format, content: data.content };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

/** backend PDF/EPUB stream URLs (public-domain only; server verifies access) */
export const getBookPdfUrl = (provider, providerBookId) =>
    `${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/pdf`;

export const getBookEpubUrl = (provider, providerBookId) =>
    `${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/epub`;

/* ── Reading progress (authenticated, cloud-synced via the existing Firebase store) ── */

export const getBookProgress = async (provider, providerBookId) => {
    try {
        const response = await api.get(`${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/progress`);
        const data = response?.data;
        if (data.status !== "ok") throw new Error(data.message || "FAILED");
        return { ok: true, record: data.record };
    } catch (e) {
        return { ok: false, record: null, error: e.message };
    }
};

/** progress payload: { readingFormat, currentPage, totalPages, currentChapter,
 *  currentLocation, scrollPosition, progressPercent, readingStatus } */
export const saveBookProgress = async (provider, providerBookId, progress) => {
    try {
        const response = await api.put(`${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/progress`, progress);
        const data = response?.data;
        if (data.status !== "ok") throw new Error(data.message || "FAILED");
        return { ok: true, record: data.record };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

export const removeBookProgress = async (provider, providerBookId) => {
    try {
        const response = await api.delete(`${BOOKS}/${encodeURIComponent(provider)}/${encodeURIComponent(providerBookId)}/progress`);
        const data = response?.data;
        return data.status === "ok" ? { ok: true } : { ok: false, error: data.message };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

/* ── Guest progress (localStorage; never claimed as cloud-synced) ── */

const GUEST_KEY = (p, id) => `bayanBookProgress:${p}:${id}`;

export const getGuestProgress = (provider, providerBookId) => {
    try { return JSON.parse(localStorage.getItem(GUEST_KEY(provider, providerBookId)) || "null"); }
    catch { return null; }
};

export const saveGuestProgress = (provider, providerBookId, progress) => {
    try {
        localStorage.setItem(GUEST_KEY(provider, providerBookId), JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }));
        return { ok: true };
    } catch { return { ok: false }; }
};

export const booksService = { searchBooks, getBook, getBookReadContent, getBookPdfUrl, getBookEpubUrl, getBookProgress, saveBookProgress, removeBookProgress, getGuestProgress, saveGuestProgress };
export default booksService;
