/**
 * providers/openlibrary.js — Open Library search (metadata + IA linkage).
 *
 * Legal posture: OL never serves book files itself. Items with an `ia`
 * identifier point at Internet Archive scans; access level (public vs
 * borrow-only vs restricted) is resolved by the iaAccess probe, not guessed.
 * Books without IA linkage are metadata-only.
 */
const { fetchJson, makeCacheHelper } = require("./baseProvider");

const OL = "https://openlibrary.org";

// OL search expects MARC language codes
const MARC = { en: "eng", ar: "ara", fr: "fre", de: "ger", es: "spa", it: "ita", ru: "rus", pt: "por", zh: "chi", ja: "jpn" };

module.exports = function createOpenLibraryProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:ol", 900);

    return {
        id: "openlibrary",
        label: "Open Library",
        searchable: true,
        capabilities: { pdf: false, epub: false, html: false, embed: false, borrow: true, download: false },

        async searchBooks(query, filters, { page = 1 }) {
            // OL search.json rejects empty q (HTTP 400) and has no browse endpoint
            if (!query || !String(query).trim()) return { count: 0, next: null, items: [] };
            const params = new URLSearchParams({ limit: "24" });
            params.set("q", String(query).slice(0, 150));
            if (filters.language) params.set("language", MARC[String(filters.language).slice(0, 2).toLowerCase()] || String(filters.language).slice(0, 12));
            if (filters.yearFrom) params.set("publish_year", `${Number(filters.yearFrom)}-${Number(filters.yearTo) || 2024}`);
            params.set("page", String(Math.max(1, Math.min(50, Number(page) || 1))));
            params.set("fields", "key,title,subtitle,author_name,first_publish_year,language,cover_i,ia,ia_collection_s,lending_edition_s");
            const url = `${OL}/search.json?${params}`;
            return cached(async () => {
                const data = await fetchJson(url, { timeoutMs: 30000 });
                const items = (data.docs || []).map(normalize).filter(Boolean);
                return { count: data.numFound || 0, next: items.length >= 24 ? Number(page) + 1 : null, items };
            }, url);
        },

        async getBook(providerBookId) {
            const key = String(providerBookId).replace(/^\/works\//, "").slice(0, 60);
            if (!/^[A-Z0-9]/i.test(key)) return null;
            return cached(async () => {
                const meta = await fetchJson(`${OL}/works/${key}.json`, { timeoutMs: 25000 });
                return normalize({
                    key: `works/${key}`,
                    title: meta.title,
                    subtitle: meta.subtitle,
                    description: typeof meta.description === "string" ? meta.description : meta.description?.value,
                    covers: meta.covers || [],
                    authors: meta.authors ? [] : [], // author resolution needs extra calls; search path has names
                });
            }, `work:${key}`);
        },

        /** resolve author names + first-publish year for a work (used by details view) */
        async enrichWork(providerBookId) {
            const key = String(providerBookId).replace(/^\/works\//, "").slice(0, 60);
            try {
                const d = await fetchJson(`${OL}/works/${key}.json`, { timeoutMs: 25000 });
                const authorRefs = d.authors || [];
                let authorName = null;
                if (authorRefs[0]?.author?.key) {
                    const a = await fetchJson(`${OL}${authorRefs[0].author.key}.json`, { timeoutMs: 15000 }).catch(() => null);
                    authorName = a?.name || null;
                }
                return { authorName, firstPublishYear: d.first_publish_date || null, covers: d.covers || [] };
            } catch { return { authorName: null, firstPublishYear: null, covers: [] }; }
        },
    };
};

/** OL search doc → normalized Book (access resolved later by IA probe) */
function normalize(d) {
    if (!d?.key) return null;
    const iaId = Array.isArray(d.ia) && d.ia.length ? d.ia[0] : null;
    const collections = Array.isArray(d.ia_collection_s) ? d.ia_collection_s : (d.ia_collection_s ? [String(d.ia_collection_s)] : []);
    const likelyRestricted = collections.some((c) => /printdisabled|inlibrary|lendinglibrary/i.test(String(c)));
    const cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false` : null;
    return {
        provider: "openlibrary",
        providerBookId: d.key.replace(/^\/works\//, ""),
        title: String(d.title || "Untitled").slice(0, 300),
        authors: (d.author_name || []).slice(0, 5),
        description: null, // OL search doesn't return descriptions; details view enriches
        cover,
        languages: d.language || [],
        subjects: [],
        publishedDate: d.first_publish_year ? String(d.first_publish_year) : null,
        license: null, // unknown until access probe — never guessed
        iaId,
        iaRestrictedHint: likelyRestricted,
        formats: {}, // OL serves no files itself
        downloadAllowed: false,
        fullTextAvailable: false, // IA probe decides
    };
}
