/**
 * providers/internetarchive.js — Internet Archive texts.
 *
 * Legal posture, verified against IA's own metadata endpoint:
 *  - collection "publicdomain*" / `access_restricted_item` false → public
 *    scan: in-site PDF viewing + download are authorized by IA.
 *  - `access_restricted_item` true / printdisabled / lending collections →
 *    borrow-only: we surface "Read on Internet Archive" (their lending UI)
 *    and NEVER expose file URLs or downloads.
 * The classification is per-item, from IA metadata — never guessed from a
 * title or collection name alone.
 */
const { fetchJson, makeCacheHelper } = require("./baseProvider");

/** IA metadata fields may be a single string or an array — always normalize */
const asArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);

module.exports = function createInternetArchiveProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:ia", 1800);

    return {
        id: "internetarchive",
        label: "Internet Archive",
        searchable: true,
        capabilities: { pdf: true, epub: false, html: false, embed: false, borrow: true, download: true },

        async searchBooks(query, filters, { page = 1 }) {
            if (!query || !String(query).trim()) return { count: 0, next: null, items: [] };
            const rows = 24;
            const clauses = [`(${String(query).slice(0, 120)})`, "mediatype:texts"];
            if (filters.language) {
                const name = { en: "english", ar: "arabic", fr: "french", de: "german", es: "spanish", it: "italian", ru: "russian" }[filters.language];
                if (name) clauses.push(`language:(${name})`);
            }
            if (filters.yearFrom) clauses.push(`year:[${Number(filters.yearFrom)} TO ${Number(filters.yearTo) || 2024}]`);
            const params = new URLSearchParams({
                q: clauses.join(" AND "),
                rows: String(rows),
                page: String(Math.max(1, Math.min(50, Number(page) || 1))),
                output: "json",
            });
            ["identifier", "title", "creator", "year", "language", "collection"].forEach((f) => params.append("fl[]", f));
            const url = `https://archive.org/advancedsearch.php?${params}`;
            return cached(async () => {
                const data = await fetchJson(url, { timeoutMs: 30000 });
                const docs = data?.response?.docs || [];
                return {
                    count: data?.response?.numFound || 0,
                    next: docs.length >= rows ? Number(page) + 1 : null,
                    items: docs.map(normalizeHit).filter(Boolean),
                };
            }, url);
        },

        /** full access classification for one item (public vs borrow vs metadata).
         * A `.lcpdf` file is DRM-protected lending (never downloadable).
         * Borrow collections (inlibrary/printdisabled/lendinglibrary) force
         * borrow-only even when access_restricted_item is unset — IA's own
         * lending system decides, we never guess. */
        async getAccess(providerBookId) {
            const id = String(providerBookId).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 100);
            if (!id) return { level: "metadata" };
            return cached(async () => {
                try {
                    const m = await fetchJson(`https://archive.org/metadata/${id}`, { timeoutMs: 15000 });
                    const restricted = Boolean(m?.metadata?.access_restricted_item);
                    const collections = asArray(m?.metadata?.collection);
                    const publicCollection = collections.some((c) => /^publicdomain/i.test(String(c)));
                    const borrowCollection = collections.some((c) => ["inlibrary", "printdisabled", "lendinglibrary"].includes(String(c)));
                    const files = m?.files || [];
                    const pdf = files.find((f) => /pdf/i.test(f.format || "") && !/\.lcpdf$/i.test(f.name || "")) || files.find((f) => /\.pdf$/i.test(f.name || ""));
                    const lcpdf = files.some((f) => /\.lcpdf$/i.test(f.name || ""));
                    if (restricted || borrowCollection || lcpdf) return { level: "borrow", pdfFile: null, collections };
                    if (pdf) return { level: "full", pdfFile: pdf.name ? `https://archive.org/download/${id}/${encodeURIComponent(pdf.name)}` : null, collections };
                    return { level: "readonline", pdfFile: null, collections };
                } catch { return { level: "metadata", pdfFile: null, collections: [] }; }
            }, `access:${id}`);
        },

        async getBook(providerBookId) {
            const access = await this.getAccess(providerBookId);
            const id = String(providerBookId).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 100);
            return cached(async () => {
                try {
                    const m = await fetchJson(`https://archive.org/metadata/${id}`, { timeoutMs: 15000 });
                    const md = m?.metadata || {};
                    return normalizeItem(id, md, access);
                } catch { return null; }
            }, `item:${id}`);
        },
    };
};

function normalizeHit(doc) {
    if (!doc?.identifier) return null;
    const collections = asArray(doc.collection);
    const likelyPublic = collections.some((c) => /^publicdomain/i.test(String(c)));
    return {
        provider: "internetarchive",
        providerBookId: String(doc.identifier).slice(0, 100),
        title: String(doc.title || "Untitled").slice(0, 300),
        authors: Array.isArray(doc.creator) ? doc.creator.slice(0, 3).map(String) : (doc.creator ? [String(doc.creator)] : []),
        description: null,
        cover: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
        languages: Array.isArray(doc.language) ? doc.language.slice(0, 3) : (doc.language ? [doc.language] : []),
        subjects: [],
        publishedDate: doc.year ? String(doc.year) : null,
        license: likelyPublic ? "public-domain" : null,
        formats: {},
        downloadAllowed: false, // resolved by getAccess() before any file URL is shown
        fullTextAvailable: false,
    };
}

function normalizeItem(id, md, access) {
    return {
        provider: "internetarchive",
        providerBookId: id,
        title: String(md.title || "Untitled").slice(0, 300),
        authors: md.creator ? (Array.isArray(md.creator) ? md.creator.map(String) : [String(md.creator)]) : [],
        description: typeof md.description === "string" ? md.description.slice(0, 1200) : null,
        cover: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        languages: md.language ? [String(md.language)] : [],
        subjects: [],
        publisher: md.publisher ? String(md.publisher).slice(0, 120) : null,
        publishedDate: md.date ? String(md.date).slice(0, 10) : null,
        license: access.level === "full" ? "public-domain" : null,
        iaId: id,
        accessLevel: access.level,
        pdfFile: access.pdfFile || null,
        formats: access.pdfFile ? { pdf: access.pdfFile } : {},
        downloadAllowed: access.level === "full" && Boolean(access.pdfFile),
        fullTextAvailable: access.level === "full",
    };
}
