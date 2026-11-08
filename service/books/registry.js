/**
 * books/registry.js — provider registry + THE unified interface.
 *
 * searchBooks(query, filters, pagination)  → merged, deduped, normalized
 * getBook(provider, providerBookId)        → one normalized Book
 * getBookReadingSources(book)              → ordered reading options
 *
 * Provider failures are isolated: one dead source never breaks the page —
 * its error is reported in `errors` while the rest still return.
 */

const createGutenbergProvider = require("./providers/gutenberg");
const createOpenLibraryProvider = require("./providers/openlibrary");
const createGoogleBooksProvider = require("./providers/googlebooks");
const createWikisourceProvider = require("./providers/wikisource");
const createInternetArchiveProvider = require("./providers/internetarchive");
const createDoabProvider = require("./providers/doab");

const providers = new Map();

/** init({ injectedCache, dao, admin }) — call once at server startup */
function initBooksRegistry({ injectedCache, dao, admin } = {}) {
    providers.clear();
    const factories = [
        createGutenbergProvider,
        createOpenLibraryProvider,
        createGoogleBooksProvider,
        createWikisourceProvider,
        createInternetArchiveProvider,
        createDoabProvider,
    ];
    for (const factory of factories) {
        try {
            const p = factory({ injectedCache, dao, admin });
            providers.set(p.id, p);
        } catch (e) {
            console.error(`books registry: provider ${factory.name} failed to init:`, e.message);
        }
    }
    return providers;
}

const getProvider = (id) => providers.get(String(id || ""));
const listProviders = () => [...providers.values()].map((p) => ({ id: p.id, label: p.label, searchable: p.searchable }));

/** merge + dedupe across providers (title+author fingerprint) */
const normalize = (s) => String(s || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const titleFingerprint = (t) => normalize(t).slice(0, 80);
const authorFingerprint = (b) => normalize((b.authors || [])[0] || "").split(" ").slice(0, 2).join(" ");

/** confidence that two normalized books are THE SAME work (never merge on title alone) */
function sameWork(a, b) {
    const t1 = titleFingerprint(a.title);
    const t2 = titleFingerprint(b.title);
    if (!t1 || !t2 || t1 !== t2) return false;
    const a1 = authorFingerprint(a);
    const a2 = authorFingerprint(b);
    const authorsKnown = Boolean(a1) && Boolean(a2);
    if (authorsKnown && a1 !== a2) return false; // different author → different book
    if (!authorsKnown) return false; // both authors unknown → refuse to merge (spec: no title-only merge)
    const y1 = parseInt(a.publishedDate, 10);
    const y2 = parseInt(b.publishedDate, 10);
    if (Number.isFinite(y1) && Number.isFinite(y2) && Math.abs(y1 - y2) > 40) return false; // implausible same work
    return true;
}

/** prefer richer metadata for the canonical record */
const richer = (a, b) => {
    const score = (x) => (x.description ? 2 : 0) + (x.cover ? 2 : 0) + (x.publisher ? 1 : 0) + (x.pageCount ? 1 : 0) + (x.isbn ? 1 : 0) + (x.fullTextAvailable ? 2 : 0);
    return score(a) >= score(b) ? a : b;
};

async function searchBooks(query, filters = {}, pagination = {}) {
    const page = Math.max(1, Math.min(50, Number(pagination.page) || 1));
    const wanted = filters.sources && filters.sources.length ? filters.sources : [...providers.keys()];
    const errors = [];
    const jobs = [];
    for (const id of wanted) {
        const p = providers.get(id);
        if (!p || !p.searchable) continue;
        jobs.push(
            p.searchBooks(query, filters, { page })
                .catch((e) => {
                    errors.push({ provider: id, message: e.message || "PROVIDER_FAILED" });
                    return { count: 0, next: null, items: [] };
                })
        );
    }
    const results = await Promise.all(jobs);

    // dedupe across providers: keep canonical record + alternative sources
    const books = [];
    for (const r of results) {
        for (const item of r.items || []) {
            if (!item) continue;
            const existing = books.find((b) => sameWork(b, item));
            if (existing) {
                const winner = richer(existing, item);
                existing.alternativeSources = [...new Set([...(existing.alternativeSources || []), item.provider])].filter((s) => s !== winner.provider);
                // merge reading options — per-provider licenses stay on each entry
                existing.formats = { ...existing.formats, ...item.formats };
                existing.downloadAllowed = existing.downloadAllowed || item.downloadAllowed;
                existing.fullTextAvailable = existing.fullTextAvailable || item.fullTextAvailable;
                existing.cover = existing.cover || item.cover;
                Object.assign(existing, winner);
            } else {
                books.push(item);
            }
        }
    }
    // public-domain / full-text first within the merged page (stable, honest ordering)
    books.sort((a, b) => (b.fullTextAvailable === a.fullTextAvailable) ? 0 : (b.fullTextAvailable ? 1 : -1));
    const count = results.reduce((n, r) => n + (r.count || 0), 0);
    const next = results.some((r) => r.next) ? page + 1 : null;
    return { count, next, items: books, errors };
}

async function getBook(provider, providerBookId) {
    const p = providers.get(String(provider || ""));
    if (!p) return null;
    try {
        return await p.getBook(providerBookId);
    } catch (e) {
        console.error(`books registry: getBook(${provider},${providerBookId}) failed:`, e.message);
        return null;
    }
}

/** ordered reading options for a book — this is what the Reading Engine consumes */
async function getBookReadingSources(book) {
    if (!book) return [];
    const sources = [];
    // 1. in-site PDF (public-domain only; proxy handles Gutenberg + IA public scans)
    if (book.formats?.pdf && book.downloadAllowed) {
        sources.push({ kind: "pdf", url: book.formats.pdf, label: "PDF", canDownload: true, license: book.license, provider: book.provider });
    } else if (book.provider === "internetarchive" && book.accessLevel === "full" && book.pdfFile) {
        sources.push({ kind: "pdf", url: book.pdfFile, label: "PDF", canDownload: true, license: book.license, provider: book.provider });
    }
    // 2. in-site EPUB via our backend proxy — the browser can't fetch remote
    //    EPUBs cross-origin (no CORS from Gutenberg); the proxy serves it
    //    same-origin. Only public-domain items reach this path.
    if (book.formats?.epub && book.downloadAllowed) {
        sources.push({ kind: "epub", url: `/books/${encodeURIComponent(book.provider)}/${encodeURIComponent(book.providerBookId)}/epub`, label: "EPUB", canDownload: true, license: book.license, provider: book.provider, proxied: true });
    }
    // 3. HTML / full text (Gutenberg + Wikisource)
    if (book.formats?.html && book.fullTextAvailable) {
        sources.push({ kind: "html", url: book.formats.html, label: "HTML", canDownload: false, license: book.license || book.licenseUrl, provider: book.provider });
    }
    // 4. Google Books embedded viewer (preview honesty enforced by the engine UI).
    //    The viewer doesn't consume API quota — available even when the API is
    //    rate-limited (viewability UNKNOWN → the viewer itself is the truth).
    if (book.provider === "googlebooks" && (book.embeddable || book.quotaLimited) && (book.previewUrl || book.providerBookId)) {
        sources.push({
            kind: "embed",
            volumeId: book.providerBookId,
            label: book.viewability === "ALL_PAGES" ? "Full view" : book.viewability === "UNKNOWN" ? "Google Books" : "Preview",
            previewOnly: book.viewability === "PARTIAL" || book.viewability === "SAMPLE" || book.viewability === "UNKNOWN",
            canDownload: false,
            provider: book.provider,
        });
    }
    // 5. borrow-only / external fallback
    if (!sources.length) {
        const externalUrl = book.previewUrl || book.sourceUrl
            || (book.provider === "openlibrary" && book.iaId ? `https://archive.org/details/${book.iaId}` : null)
            || (book.provider === "gutenberg" ? `https://www.gutenberg.org/ebooks/${book.providerBookId}` : null);
        if (externalUrl) {
            sources.push({
                kind: "external",
                url: externalUrl,
                label: book.accessLevel === "borrow" ? "borrow" : "source",
                canDownload: false,
                borrowOnly: book.accessLevel === "borrow" || book.iaRestrictedHint === true,
                provider: book.provider,
            });
        }
    }
    return sources;
}

module.exports = { initBooksRegistry, searchBooks, getBook, getBookReadingSources, getProvider, listProviders };
