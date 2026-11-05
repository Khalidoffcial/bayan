/**
 * books.service.js — Free books discovery + reading (Gutendex/Open Library).
 *
 * Sources and legal posture (verified live):
 *  - Gutendex  → Project Gutenberg metadata. Gutenberg books are PUBLIC DOMAIN
 *    in the US (mostly pre-1929 + some cleared). Formats include PDF, EPUB,
 *    HTML, TXT — direct download/read is authorized by Gutenberg's own terms.
 *  - Open Library → metadata + covers; `ia` ids point to Internet Archive
 *    scans. Restricted items (access_restricted_item / printdisabled) are
 *    borrow-only on archive.org — we surface them as "Read on source" and
 *    NEVER fabricate a direct PDF URL for them.
 *
 * No API keys, no cost. Requests are cached server-side (memory cache via
 * the injected cache helpers, same pattern as audioHub.service).
 */

const GUTENDEX = "https://gutendex.com";
const OL = "https://openlibrary.org";

// ---- injected cache (memory/redis) ----
let injectedCache = null;
function initBooks({ cacheGet, cacheSet }) {
    injectedCache = { cacheGet, cacheSet };
}

async function fetchJson(url, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502 });
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ---- normalization -------------------------------------------------------

/** Classify access for a normalized book. Never a fake URL. */
function classifyAccess({ gutenbergFormats, iaId, iaRestricted }) {
    if (gutenbergFormats && (gutenbergFormats["application/pdf"] || gutenbergFormats["application/epub+zip"] || gutenbergFormats["text/html"])) {
        return {
            level: "full", // public domain — read + download authorized by Gutenberg
            source: "Project Gutenberg",
            sourceUrl: gutenbergFormats["text/html"]
                ? gutenbergFormats["text/html"].replace("?ref=24", "")
                : "https://www.gutenberg.org",
        };
    }
    if (iaId) {
        if (iaRestricted) {
            return { level: "borrow", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` };
        }
        return { level: "full", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` };
    }
    return { level: "metadata", source: "Open Library", sourceUrl: null };
}

function normalizeGutenberg(b) {
    if (!b || !b.id) return null;
    const pdf = b.formats?.["application/pdf"] || null;
    const epub = b.formats?.["application/epub+zip"] || null;
    const html = b.formats?.["text/html"] || null;
    const txt = Object.entries(b.formats || {}).find(([k]) => k.startsWith("text/plain"))?.[1] || null;
    return {
        id: `gb:${b.id}`,
        gutenbergId: b.id,
        title: String(b.title || "Untitled").slice(0, 300),
        author: (b.authors || []).map((a) => a.name).join(", ") || "Unknown",
        year: b.authors?.[0]?.birth_year ? String(b.authors[0].birth_year) : null,
        languages: b.languages || [],
        subjects: (b.subjects || []).slice(0, 8),
        cover: b.formats?.["image/jpeg"] || null,
        pdfUrl: pdf,
        epubUrl: epub,
        htmlUrl: html,
        textUrl: txt,
        downloadUrls: { pdf, epub, html: html, txt }, // Gutenberg = public domain, download authorized
        copyright: Boolean(b.copyright),
        access: { level: "full", source: "Project Gutenberg", sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}` },
    };
}

function normalizeOL(d) {
    if (!d?.key) return null;
    const iaId = Array.isArray(d.ia) && d.ia.length ? d.ia[0] : null;
    const cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false` : null;
    // collections can hint at lending-only scans; refined per-item via IA probe
    const collections = Array.isArray(d.ia_collection_s) ? d.ia_collection_s : (d.ia_collection_s ? [String(d.ia_collection_s)] : []);
    const likelyRestricted = collections.some((c) => /printdisabled|inlibrary|lendinglibrary/i.test(String(c)));
    return {
        id: `ol:${d.key.replace(/^\/works\//, "")}`,
        olKey: d.key,
        title: String(d.title || "Untitled").slice(0, 300),
        author: (d.author_name || []).join(", ") || "Unknown",
        year: d.first_publish_year ? String(d.first_publish_year) : null,
        languages: d.language || [],
        subjects: [],
        cover,
        pdfUrl: null, // OL itself never serves PDFs — access is via IA/gutenberg only
        epubUrl: null,
        htmlUrl: null,
        textUrl: null,
        iaId,
        access: classifyAccess({ iaId, iaRestricted: likelyRestricted }), // refined via IA metadata probe
        provider: "openlibrary",
    };
}

// ---- searches ------------------------------------------------------------

async function searchGutenberg({ q, languages, page = 1 }) {
    const params = new URLSearchParams();
    if (q) params.set("search", q.slice(0, 120));
    if (languages) params.set("languages", String(languages).slice(0, 20));
    params.set("page", String(Math.max(1, Math.min(50, Number(page) || 1))));
    const url = `${GUTENDEX}/books?${params}`;
    const cacheKey = `books:gutendex:${url}`;
    const cached = injectedCache ? await injectedCache.cacheGet(cacheKey) : null;
    if (cached) return cached;
    const data = await fetchJson(url);
    const out = {
        count: data.count || 0,
        next: data.next ? Number(new URL(data.next).searchParams.get("page")) : null,
        previous: data.previous ? Number(new URL(data.previous).searchParams.get("page")) : null,
        items: (data.results || []).map(normalizeGutenberg).filter(Boolean),
    };
    if (injectedCache) await injectedCache.cacheSet(cacheKey, out, 900);
    return out;
}

async function searchOpenLibrary({ q, language, yearFrom, yearTo, page = 1 }) {
    // OL search.json rejects empty queries (HTTP 400) and there is no official
    // browse endpoint, so Open Library results only appear for real searches.
    if (!q || !String(q).trim()) return { count: 0, next: null, previous: null, items: [] };
    const params = new URLSearchParams({ limit: "24" });
    params.set("q", q.slice(0, 150));
    // OL search uses MARC language codes ("eng", "ara", …) — map from ISO 639-1
    const MARC = { en: "eng", ar: "ara", fr: "fre", de: "ger", es: "spa", it: "ita", ru: "rus", pt: "por", zh: "chi", ja: "jpn" };
    if (language) params.set("language", MARC[String(language).slice(0, 2).toLowerCase()] || String(language).slice(0, 12));
    if (yearFrom) params.set("publish_year", `${Number(yearFrom)}-${Number(yearTo) || 2024}`);
    params.set("page", String(Math.max(1, Math.min(50, Number(page) || 1))));
    params.set("fields", "key,title,author_name,first_publish_year,language,cover_i,ia,ia_collection_s");
    const url = `${OL}/search.json?${params}`;
    const cacheKey = `books:ol:${url}`;
    const cached = injectedCache ? await injectedCache.cacheGet(cacheKey) : null;
    if (cached) return cached;
    const data = await fetchJson(url);
    const items = (data.docs || []).map(normalizeOL).filter(Boolean);
    const out = { count: data.numFound || 0, next: items.length >= 24 ? (Number(page) + 1) : null, previous: null, items };
    if (injectedCache) await injectedCache.cacheSet(cacheKey, out, 900);
    return out;
}

/**
 * unifiedSearch — merges Gutendex + Open Library, dedupes by title+author,
 * marks access levels honestly. Gutendex items come first (they are
 * guaranteed full-access public domain).
 */
async function unifiedSearch({ q, language, yearFrom, yearTo, source, page = 1 }) {
    const jobs = [];
    if (!source || source === "gutenberg") jobs.push(searchGutenberg({ q, languages: language, page }).catch(() => ({ items: [], count: 0, next: null, error: "GUTENDEX_DOWN" })));
    if (!source || source === "openlibrary") jobs.push(searchOpenLibrary({ q, language, yearFrom, yearTo, page }).catch(() => ({ items: [], count: 0, next: null, error: "OPENLIBRARY_DOWN" })));
    const [g, ol] = await Promise.all(jobs);
    const merged = [];
    const seen = new Set();
    for (const item of [...(g?.items || []), ...(ol?.items || [])]) {
        const dedupeKey = `${(item.title || "").toLowerCase().slice(0, 60)}|${(item.author || "").toLowerCase().slice(0, 40)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        merged.push(item);
    }
    return {
        count: (g?.count || 0) + (ol?.count || 0),
        items: merged,
        next: (g?.next || ol?.next) ? page + 1 : null,
        errors: [g?.error, ol?.error].filter(Boolean),
    };
}

/** single book by our composite id (gb:<id> | ol:<workKey>) */
async function getBook(id) {
    if (id.startsWith("gb:")) {
        const gid = id.slice(3).replace(/\D/g, "").slice(0, 8);
        const data = await fetchJson(`${GUTENDEX}/books/${gid}`, 60000);
        return normalizeGutenberg(data);
    }
    if (id.startsWith("ol:")) {
        const key = id.slice(3);
        const data = await fetchJson(`${OL}/works/${key}.json`);
        const meta = data || {};
        return normalizeOL({
            key: `works/${key}`,
            title: meta.title,
            description: typeof meta.description === "string" ? meta.description : meta.description?.value || null,
            covers: meta.covers || [],
            authors: [],
        });
    }
    return null;
}

/** IA access check for an OL book — honest borrow/full classification. */
async function probeIaAccess(iaId) {
    const cacheKey = `books:ia:${iaId}`;
    const cached = injectedCache ? await injectedCache.cacheGet(cacheKey) : null;
    if (cached) return cached;
    let out = { level: "metadata", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` };
    try {
        const m = await fetchJson(`https://archive.org/metadata/${iaId}`, 12000);
        const restricted = Boolean(m?.metadata?.access_restricted_item);
        const collections = m?.metadata?.collection || [];
        const formats = (m?.files || []).map((f) => f.format);
        const hasPdf = formats.includes("Text PDF") || formats.some((f) => /pdf/i.test(f));
        out = restricted
            ? { level: "borrow", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` }
            : hasPdf
                ? { level: "full", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` }
                : { level: "readonline", source: "Internet Archive", sourceUrl: `https://archive.org/details/${iaId}` };
    } catch { /* keep metadata fallback */ }
    if (injectedCache) await injectedCache.cacheSet(cacheKey, out, 1800);
    return out;
}

/** plain text / html content of a Gutenberg book — for the in-site reader */
async function getGutenbergText(gid) {
    const candidates = [
        `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}-images.html`,
        `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.html.utf8`,
        `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.txt.utf8`,
    ];
    for (const url of candidates) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) continue;
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("text/html")) return { format: "html", content: await res.text() };
            if (ct.includes("text/plain")) return { format: "text", content: await res.text() };
        } catch { /* next candidate */ }
    }
    return null;
}

/** Stream a Gutenberg PDF through our server (avoids CORS, keeps Range support).
 *  Only for public-domain Gutenberg ebooks — access level is checked first. */
async function resolveGutenbergPdfUrl(gid) {
    const data = await fetchJson(`${GUTENDEX}/books/${gid}`, 60000);
    const pdf = data?.formats?.["application/pdf"];
    return pdf ? pdf.replace("?ref=24", "") : null;
}

module.exports = { initBooks, unifiedSearch, getBook, probeIaAccess, getGutenbergText, resolveGutenbergPdfUrl };
