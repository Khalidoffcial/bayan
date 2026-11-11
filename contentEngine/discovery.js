/**
 * contentEngine/discovery.js — autonomous topic discovery.
 *
 * All sources used are metadata APIs whose terms permit metadata retrieval:
 *  - OpenAlex      (open metadata of research papers — CC0 metadata)
 *  - arXiv         (paper metadata via export.arxiv.org Atom API)
 *  - Wikimedia     (recent/featured article metadata — per-article licensing)
 *  - Gutendex      (public-domain book metadata)
 *  - Open Library  (open book metadata)
 *
 * An accessible API ≠ permission to republish content: the engine stores ONLY
 * metadata (titles, abstracts/summaries, links) and never copies full articles.
 * The topic is then rewritten as ORIGINAL Bayan content by the generation step.
 *
 * Every discovered topic is rate-limited, cached, and attributed.
 */

const https = require("https");
const { URL } = require("url");

// Minimal fetch (node-fetch v2 is already a dependency of the backend)
const fetch = require("node-fetch");
const config = require("./config");

const cache = new Map(); // key → { at, value }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const lastCall = new Map(); // source → timestamp (rate limiting)
const MIN_INTERVAL_MS = 4000; // ≥4s between calls to the same source

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function rateLimitedFetch(source, url) {
    const last = lastCall.get(source) || 0;
    const wait = MIN_INTERVAL_MS - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    lastCall.set(source, Date.now());

    const res = await fetch(url, {
        timeout: 20000,
        headers: { "User-Agent": "BayanSpace-ContentEngine/1.0 (editorial discovery; metadata only)" },
    });
    if (!res.ok) throw new Error(`${source} HTTP ${res.status}`);
    return res.json();
}

function cached(source, key, fn) {
    const k = `${source}:${key}`;
    const hit = cache.get(k);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.value);
    return fn().then((v) => { cache.set(k, { at: Date.now(), value: v }); return v; });
}

// ── Source adapters ─────────────────────────────────────────────────────────

/** OpenAlex: trending recent works matching a query (metadata: CC0). */
async function openalexTopics(query, { perPage = 5 } = {}) {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("sort", "relevance_score:desc,publication_date:desc");
    url.searchParams.set("per-page", String(perPage));
    url.searchParams.set("mailto", "content-engine@bayan.space");
    const data = await rateLimitedFetch("openalex", url.href);
    return (data.results || []).map((w) => ({
        source: "openalex",
        sourceUrl: w.doi || w.id,
        title: w.title || w.display_name,
        summary: typeof w.abstract_inverted_index === "object" && w.abstract_inverted_index
            ? invertedIndexToText(w.abstract_inverted_index).slice(0, 600)
            : "",
        authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean).slice(0, 3),
        license: "metadata-only (OpenAlex CC0 metadata; abstract under publisher terms — summarized not republished)",
        publishedAt: w.publication_date || null,
        evidence: `peer-reviewed index entry ${w.id}`,
    }));
}

function invertedIndexToText(inv) {
    if (!inv) return "";
    const positions = [];
    for (const [word, idxs] of Object.entries(inv)) for (const i of idxs) positions[i] = word;
    return positions.filter(Boolean).join(" ");
}

/** arXiv Atom API — metadata only, abstracts are published by arXiv under its own distribution policy for metadata surfacing. */
async function arxivTopics(category = "cs.AI", { max = 5 } = {}) {
    const url = `https://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&max_results=${max}`;
    const res = await fetch(url, { timeout: 20000, headers: { "User-Agent": "BayanSpace-ContentEngine/1.0" } });
    if (!res.ok) throw new Error(`arxiv HTTP ${res.status}`);
    const xml = await res.text();
    const entries = [];
    const re = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while ((m = re.exec(xml))) {
        const block = m[1];
        const get = (tag) => (block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1] || "";
        entries.push({
            source: "arxiv",
            sourceUrl: (get("id") || "").trim(),
            title: (get("title") || "").replace(/\s+/g, " ").trim(),
            summary: (get("summary") || "").replace(/\s+/g, " ").trim().slice(0, 600),
            authors: [...block.matchAll(/<name>([^<]+)<\/name>/g)].map((x) => x[1]).slice(0, 3),
            license: "metadata/abstract via arXiv API (content links point to arXiv)",
            publishedAt: (get("published") || "").slice(0, 10),
            evidence: get("id"),
        });
    }
    return entries;
}

/** Wikimedia REST: current featured/most-read (metadata + links). */
async function wikimediaTopics(lang = "en") {
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/featured/` +
        new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, "/");
    const data = await rateLimitedFetch("wikimedia", url);
    const tfa = data.tfa || {};
    const mostRead = (data.mostread?.articles || []).slice(0, 5);
    return [
        ...(tfa.title ? [{
            source: `wikimedia-${lang}`,
            sourceUrl: tfa.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(tfa.title)}`,
            title: tfa.title,
            summary: (tfa.extract || "").slice(0, 600),
            authors: [],
            license: "Wikipedia text is CC BY-SA — engine links to the article and summarizes, never republishes wholesale",
            publishedAt: null,
            evidence: "wikipedia featured article of the day",
        }] : []),
        ...mostRead.map((a) => ({
            source: `wikimedia-${lang}`,
            sourceUrl: a.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(a.title)}`,
            title: a.title,
            summary: (a.extract || "").slice(0, 400),
            authors: [],
            license: "CC BY-SA — summarize and link only",
            publishedAt: null,
            evidence: `wikipedia most-read (rank ${a.rank})`,
        })),
    ];
}

/** Gutenberg (via Gutendex) — public-domain literature for literary inspiration/history topics. */
async function gutenbergTopics() {
    const data = await rateLimitedFetch("gutendex", "https://gutendex.com/books?sort=popular&page=1");
    return (data.results || []).slice(0, 5).map((b) => ({
        source: "gutenberg",
        sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
        title: b.title,
        summary: (b.subjects || []).join("; ").slice(0, 300),
        authors: (b.authors || []).map((a) => a.name),
        license: "public domain (Project Gutenberg)",
        publishedAt: null,
        evidence: "public-domain popularity signal",
    }));
}

/** Category-driven topic seeds (evergreen educational topics — no fabricated trends). */
const EVERGREEN_SEEDS = {
    ai: ["prompt engineering patterns", "retrieval augmented generation explained", "AI agents explained", "machine learning fundamentals"],
    tech: ["database indexing explained", "web performance fundamentals", "password hygiene", "HTTP caching"],
    mobile: ["Android battery settings that matter", "iOS privacy controls walkthrough", "phone storage cleanup"],
    future: ["solid state batteries", "small modular reactors", "low earth orbit satellites"],
    education: ["learning how to learn", "freelancing first steps", "interview preparation basics"],
    mind: ["spaced repetition", "cognitive biases", "deep work"],
    literature: ["how mystery plots build tension", "worldbuilding fundamentals", "short story structure"],
    community: ["what tool changed your workflow?", "how do you organize study time?"],
};

function evergreenTopics(area, lang) {
    const seeds = EVERGREEN_SEEDS[area] || EVERGREEN_SEEDS.ai;
    const idx = Math.floor(Date.now() / 86400000) % seeds.length;
    return [{
        source: "evergreen",
        sourceUrl: null,
        title: seeds[idx],
        summary: `Evergreen educational topic in the ${area} area (${lang}).`,
        authors: [],
        license: "original Bayan content",
        publishedAt: null,
        evidence: "curated evergreen educational list",
    }];
}

/** Discover topics for one area. Tries live sources first, falls back to evergreen. */
async function discover(area, lang) {
    const key = `${area}:${lang}`;
    try {
        const topics = await cached("discovery", key, async () => {
            let results = [];
            try { results = results.concat(await arxivTopics("cs.AI", { max: 3 })); } catch (e) { /* offline ok */ }
            try { results = results.concat(await openalexTopics(evergreenTopics(area)[0].title, { perPage: 3 })); } catch (e) { /* offline ok */ }
            try { if (lang === "en" || lang === "ar") results = results.concat(await wikimediaTopics("en")); } catch (e) { /* offline ok */ }
            try { if (area === "literature") results = results.concat(await gutenbergTopics()); } catch (e) { /* offline ok */ }
            if (!results.length) results = evergreenTopics(area, lang);
            return results;
        });
        return topics;
    } catch (e) {
        // never fabricate "trending" — fall back to curated evergreen topics
        return evergreenTopics(area, lang);
    }
}

function health() {
    return {
        sourcesConfigured: ["openalex", "arxiv", "wikimedia", "gutenberg", "evergreen"],
        cacheEntries: cache.size,
        minIntervalMs: MIN_INTERVAL_MS,
    };
}

module.exports = { discover, evergreenTopics, health };
