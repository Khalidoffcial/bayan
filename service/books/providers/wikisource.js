/**
 * providers/wikisource.js — Wikisource (MediaWiki) as a book text source.
 *
 * Legal posture: all Wikisource text is free content (mostly CC BY-SA or
 * public domain per the wiki's license policy). We serve the rendered HTML
 * via the MediaWiki REST API and mark licenseUrl accordingly. Reading is
 * full-text in-site; there is no PDF/EPUB and no downloads from our side.
 *
 * Search hits both language editions (ar + en) via action=list=search;
 * page content via /w/rest.php/v1/page/<title>/html.
 */
const { fetchJson, fetchText, makeCacheHelper } = require("./baseProvider");

const EDITIONS = [
    { lang: "ar", host: "ar.wikisource.org", label: "ويكي مصدر (عربي)" },
    { lang: "en", host: "en.wikisource.org", label: "Wikisource (English)" },
];

module.exports = function createWikisourceProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:ws", 900);

    return {
        id: "wikisource",
        label: "Wikisource",
        searchable: true,
        capabilities: { pdf: false, epub: false, html: true, embed: false, borrow: false, download: false },

        /** search merges both language editions (each its own page slice) */
        async searchBooks(query, filters, { page = 1 }) {
            if (!query || !String(query).trim()) return { count: 0, next: null, items: [] };
            const srlimit = 10;
            const jobs = EDITIONS.map(async (ed) => {
                try {
                    const url = `https://${ed.host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(String(query).slice(0, 100))}&srlimit=${srlimit}&sroffset=${(Math.max(1, Number(page)) - 1) * srlimit}&format=json`;
                    const data = await cached(() => fetchJson(url, { timeoutMs: 20000 }), url);
                    const total = data?.query?.searchinfo?.totalhits || 0;
                    return {
                        count: total,
                        next: total > Math.max(1, Number(page)) * srlimit ? Number(page) + 1 : null,
                        items: (data?.query?.search || []).map((r) => normalizeHit(r, ed)),
                    };
                } catch { return { count: 0, next: null, items: [] }; } // edition down → skip it
            });
            const all = await Promise.all(jobs);
            return {
                count: all.reduce((n, r) => n + r.count, 0),
                next: all.some((r) => r.next) ? Number(page) + 1 : null,
                items: all.flatMap((r) => r.items),
            };
        },

        async getBook(providerBookId) {
            // Express decodes the path segment once; our id embeds another
            // encoded title (ws:<lang>:<encoded title>) — decode it too.
            const raw = String(providerBookId);
            let decoded = raw;
            try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
            const [, lang, title] = decoded.match(/^ws:([a-z-]+):(.+)$/) || [];
            if (!lang || !title) return null;
            const ed = EDITIONS.find((e) => e.lang === lang);
            if (!ed) return null;
            const pageTitle = (() => { try { return decodeURIComponent(title); } catch { return title; } })();
            return cached(async () => {
                const url = `https://${ed.host}/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json`;
                const data = await fetchJson(url, { timeoutMs: 25000 });
                const p = Object.values(data?.query?.pages || {})[0];
                if (!p || p.missing !== undefined) return null;
                const book = normalizeHit({ title: p.title }, ed, p.extract || null);
                // chapter detection: works/anthologies are index pages whose
                // wikitext links to subpages (Page/Chapter). Extract them in
                // order so the reader can offer real chapters.
                book.chapters = await this.getChapters(lang, pageTitle).catch(() => []);
                return book;
            }, `id:${providerBookId}`);
        },

        /** ordered chapter list of a work's index page (empty for plain pages) */
        async getChapters(lang, pageTitle) {
            const ed = EDITIONS.find((e) => e.lang === lang);
            if (!ed) return [];
            return cached(async () => {
                const url = `https://${ed.host}/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`;
                const data = await fetchJson(url, { timeoutMs: 20000 });
                const wikitext = data?.parse?.wikitext?.["*"] || "";
                const prefix = pageTitle + "/";
                const seen = new Set();
                const chapters = [];
                const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
                let m;
                while ((m = re.exec(wikitext)) && chapters.length < 200) {
                    const target = m[1].trim();
                    if (!target.startsWith(prefix)) continue;          // only this work's subpages
                    if (target.includes("#") || target.includes(":")) continue; // sections/namespaces out
                    if (seen.has(target)) continue;
                    seen.add(target);
                    const label = (m[2] || target.slice(prefix.length)).trim();
                    chapters.push({ title: label.slice(0, 200), path: target });
                }
                return chapters;
            }, `ch:${lang}:${pageTitle}`);
        },

        /** rendered HTML of a Wikisource page (their own API-rendered output).
         *  Accepts a plain page id (ws:lang:Title) or a chapter id
         *  (ws:lang:Title/Chapter) so the reader serves real chapters. */
        async getReadContent(providerBookId) {
            const raw = String(providerBookId);
            let decoded = raw;
            try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
            const [, lang, title] = decoded.match(/^ws:([a-z-]+):(.+)$/) || [];
            if (!lang || !title) return null;
            const pageTitle = (() => { try { return decodeURIComponent(title); } catch { return title; } })();
            try {
                const html = await fetchText(`https://${lang}.wikisource.org/w/rest.php/v1/page/${encodeURIComponent(pageTitle)}/html`, 25000);
                if (!html || html.length < 100) return null;
                return { format: "html", content: html.slice(0, 2000000) };
            } catch { return null; }
        },
    };
};

function normalizeHit(r, edition, extract) {
    if (!r?.title) return null;
    const title = String(r.title).slice(0, 300);
    return {
        provider: "wikisource",
        providerBookId: `ws:${edition.lang}:${title}`, // raw title; URL-encoding happens once at the client
        title,
        authors: [], // Wikisource pages usually lack a single author field
        description: extract ? extract.slice(0, 300) : (r.snippet ? String(r.snippet).replace(/<[^>]+>/g, "") : null),
        cover: null,
        languages: [edition.lang],
        subjects: [],
        license: "cc-by-sa",
        licenseUrl: `https://${edition.host}/wiki/Wikisource:Copyright`,
        formats: { html: `https://${edition.host}/wiki/${encodeURIComponent(title)}` },
        downloadAllowed: false, // we serve HTML reading; no file downloads from our side
        fullTextAvailable: true,
    };
}
