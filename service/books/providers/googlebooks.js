/**
 * providers/googlebooks.js — Google Books API (no key required for search,
 * `country` param required from non-US IPs; key support via GOOGLE_BOOKS_API_KEY
 * env if the deployment provides one — never sent from the browser).
 *
 * Legal posture: Google returns `viewability`:
 *   - "ALL_PAGES"      → full public-domain scan, embeddable viewer allowed
 *   - "PARTIAL"/"SAMPLE" → preview only — we surface the embedded viewer but
 *     label it honestly as a preview; no download links are ever exposed.
 *   - "NO_PAGES"       → metadata only.
 * Download (pdf/epub isAvailable) only exists for public-domain books.
 */
const { fetchJson, stripHtml, makeCacheHelper } = require("./baseProvider");

const GB = "https://www.googleapis.com/books/v1";

module.exports = function createGoogleBooksProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:gbk", 900);
    const keyParam = () => (process.env.GOOGLE_BOOKS_API_KEY ? `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}` : "");

    // quota guard: after a 429 we back off for 10 min and never hammer the API
    let blockedUntil = 0;
    const QUOTA_BACKOFF_MS = 10 * 60 * 1000;
    const quotaBlocked = () => Date.now() < blockedUntil;
    const markQuota = () => { blockedUntil = Date.now() + QUOTA_BACKOFF_MS; };

    return {
        id: "googlebooks",
        label: "Google Books",
        searchable: true,
        capabilities: { pdf: false, epub: false, html: false, embed: true, borrow: false, download: false },

        async searchBooks(query, filters, { page = 1 }) {
            if (quotaBlocked()) return { count: 0, next: null, items: [], quotaLimited: true };
            if (!query || !String(query).trim()) return { count: 0, next: null, items: [] }; // GB requires a query
            const startIndex = Math.max(0, (Number(page) - 1)) * 24;
            const parts = [String(query).slice(0, 120)];
            if (filters.author) parts.push(`inauthor:${filters.author.slice(0, 60)}`);
            if (filters.subject) parts.push(`subject:${filters.subject.slice(0, 40)}`);
            if (filters.isbn) parts.push(`isbn:${String(filters.isbn).replace(/[^0-9Xx]/g, "").slice(0, 13)}`);
            if (filters.yearFrom) parts.push(`${filters.yearFrom}..${Number(filters.yearTo) || new Date().getFullYear()}`);
            if (filters.language) parts.push(`langredir:${filters.language}`); // langredir is the search-only lang operator
            const url = `${GB}/volumes?q=${encodeURIComponent(parts.join(" "))}&country=US&maxResults=24&startIndex=${startIndex}&fields=totalItems,items(id,volumeInfo(title,subtitle,authors,publisher,publishedDate,description,industryIdentifiers,imageLinks,pageCount,language,categories),accessInfo(viewability,embeddable,publicDomain,webReaderLink,epub/isAvailable,pdf/isAvailable,downloadAccess))${keyParam()}`;
            return cached(async () => {
                const data = await fetchJson(url, { timeoutMs: 30000 });
                return {
                    count: data.totalItems || 0,
                    next: (data.items || []).length >= 24 ? Number(page) + 1 : null,
                    items: (data.items || []).map(normalize).filter(Boolean),
                };
            }, url).catch((e) => {
                if (String(e.message).includes("429")) markQuota();
                throw e;
            });
        },

        async getBook(providerBookId) {
            const id = String(providerBookId).slice(0, 40);
            if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
            // Details API may be quota-limited; the EMBEDDED VIEWER does not
            // consume quota, so we still return a minimal renderable book —
            // the reader page shows title "…" + the viewer, never a 404.
            if (quotaBlocked()) {
                return this._fallbackBook(id);
            }
            return cached(async () => {
                const v = await fetchJson(`${GB}/volumes/${id}?country=US${keyParam()}`, { timeoutMs: 25000 });
                return normalize(v);
            }, `id:${id}`).catch((e) => {
                if (String(e.message).includes("429")) {
                    markQuota();
                    return this._fallbackBook(id);
                }
                throw e;
            });
        },

        /** minimal renderable book when the Details API is quota-limited —
         *  the embedded viewer doesn't consume quota, so reading still works */
        _fallbackBook(id) {
            return {
                provider: "googlebooks",
                providerBookId: id,
                titleKey: "books.gb.titleFallback", // client translates it
                title: "Google Books volume",
                authors: [],
                cover: `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`,
                viewability: "UNKNOWN",
                embeddable: true,
                formats: {},
                downloadAllowed: false,
                fullTextAvailable: false,
                quotaLimited: true,
            };
        },
    };
};

/** Google volume → normalized Book */
function normalize(v) {
    const info = v.volumeInfo || {};
    const access = v.accessInfo || {};
    const isbn = (info.industryIdentifiers || []).find((i) => i.type === "ISBN_13")?.identifier
        || (info.industryIdentifiers || []).find((i) => i.type === "ISBN_10")?.identifier
        || null;
    const viewability = access.viewability || "NO_PAGES";
    const publicDomain = Boolean(access.publicDomain);
    const cover = info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)
        ? info.imageLinks.thumbnail.replace(/^http:/, "https:").replace("&zoom=1", "&zoom=2") : null;
    return {
        provider: "googlebooks",
        providerBookId: v.id,
        title: stripHtml(info.title || "Untitled").slice(0, 300),
        subtitle: info.subtitle ? stripHtml(info.subtitle).slice(0, 200) : null,
        authors: (info.authors || []).slice(0, 5),
        description: info.description ? stripHtml(info.description).slice(0, 1200) : null,
        cover,
        languages: info.language ? [info.language] : [],
        subjects: (info.categories || []).slice(0, 8),
        publisher: info.publisher ? stripHtml(info.publisher).slice(0, 120) : null,
        publishedDate: info.publishedDate ? String(info.publishedDate).slice(0, 10) : null,
        pageCount: Number.isFinite(info.pageCount) ? info.pageCount : null,
        isbn,
        previewUrl: access.webReaderLink || null,
        viewability,
        embeddable: Boolean(access.embeddable),
        license: publicDomain ? "public-domain" : null,
        formats: {}, // Google never gives direct file URLs
        downloadAllowed: false,
        fullTextAvailable: viewability === "ALL_PAGES",
    };
}
