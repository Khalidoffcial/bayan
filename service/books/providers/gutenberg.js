/**
 * providers/gutenberg.js — Project Gutenberg via Gutendex.
 *
 * Legal posture: Gutenberg books are public domain in the US (Gutendex
 * exposes a `copyright` flag — we only mark full access when false).
 * Formats include EPUB/HTML/TXT (PDFs are rare nowadays); download and
 * in-site reading are authorized by Gutenberg's own terms.
 */
const { fetchJson, fetchText, stripHtml, makeCacheHelper } = require("./baseProvider");

const GUTENDEX = "https://gutendex.com";

module.exports = function createGutenbergProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:gb", 900);

    return {
        id: "gutenberg",
        label: "Project Gutenberg",
        searchable: true,
        capabilities: { pdf: true, epub: true, html: true, embed: false, borrow: false, download: true },

        async searchBooks(query, filters, { page = 1 }) {
            const params = new URLSearchParams();
            if (query) params.set("search", String(query).slice(0, 120));
            if (filters.language) params.set("languages", String(filters.language).slice(0, 20));
            if (filters.yearFrom) params.set("start_year", String(filters.yearFrom));
            if (filters.yearTo) params.set("end_year", String(filters.yearTo));
            if (filters.sort === "popular") params.set("sort", "popular");
            params.set("page", String(Math.max(1, Math.min(50, Number(page) || 1))));
            const url = `${GUTENDEX}/books?${params}`;
            return cached(async () => {
                const data = await fetchJson(url, { timeoutMs: 60000, retries: 2 });
                return {
                    count: data.count || 0,
                    next: data.next ? Number(new URL(data.next).searchParams.get("page")) : null,
                    items: (data.results || []).map(normalize),
                };
            }, url);
        },

        async getBook(providerBookId) {
            const gid = String(providerBookId).replace(/\D/g, "").slice(0, 8);
            if (!gid) return null;
            return cached(async () => {
                let lastErr = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        return normalize(await fetchJson(`${GUTENDEX}/books/${gid}`, { timeoutMs: 45000, retries: 1 }));
                    } catch (e) {
                        lastErr = e;
                        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
                    }
                }
                throw lastErr;
            }, `id:${gid}`);
        },

        /** in-site HTML/plain-text reading content — only public-domain books */
        async getReadContent(providerBookId) {
            const gid = String(providerBookId).replace(/\D/g, "").slice(0, 8);
            if (!gid) return null;
            const candidates = [
                `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}-images.html`,
                `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.html.utf8`,
                `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.txt.utf8`,
            ];
            for (const url of candidates) {
                try {
                    const text = await fetchText(url, 20000);
                    if (!text || text.length < 200) continue;
                    return { format: /html/i.test(url) ? "html" : "text", content: text.slice(0, 2000000) };
                } catch { /* next candidate */ }
            }
            return null;
        },

        /** direct PDF byte URL, if Gutenberg published one for this ebook */
        async getPdfUrl(providerBookId) {
            const gid = String(providerBookId).replace(/\D/g, "").slice(0, 8);
            if (!gid) return null;
            try {
                const b = await this.getBook(gid);
                if (!b || b.copyright) return null;
                return b.pdfUrl;
            } catch { return null; }
        },
    };
};

/** Gutendex result → normalized Book */
function normalize(b) {
    if (!b?.id) return null;
    const formats = b.formats || {};
    const pick = (pred) => {
        const hit = Object.entries(formats).find(([k]) => pred(k));
        return hit ? hit[1] : null;
    };
    const publicDomain = !b.copyright;
    return {
        provider: "gutenberg",
        providerBookId: String(b.id),
        title: stripHtml(b.title || "Untitled").slice(0, 300),
        authors: (b.authors || []).map((a) => stripHtml(a.name)),
        description: (b.summaries || [])[0] ? stripHtml(b.summaries[0]).slice(0, 1000) : null,
        cover: formats["image/jpeg"] || null,
        languages: b.languages || [],
        subjects: (b.subjects || []).slice(0, 8),
        publishedDate: b.authors?.[0]?.birth_year ? String(b.authors[0].birth_year) : null,
        license: publicDomain ? "public-domain" : "copyright",
        copyright: Boolean(b.copyright),
        formats: {
            pdf: pick((k) => k.startsWith("application/pdf")),
            epub: pick((k) => k.startsWith("application/epub+zip")),
            html: pick((k) => k.startsWith("text/html")),
            text: pick((k) => k.startsWith("text/plain")),
        },
        downloadAllowed: publicDomain, // Gutenberg authorizes downloads of public-domain files
        fullTextAvailable: publicDomain,
    };
}
