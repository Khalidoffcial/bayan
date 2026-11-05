/**
 * providers/doab.js — DOAB (Directory of Open Access Books) + OAPEN.
 *
 * Both services share one DSpace backend (library.oapen.org mirrors DOAB).
 * Their REST search API rejects server-side requests (403 for datacenter
 * IPs), but the OAI-PMH endpoint (oai/request) is open. We therefore keep a
 * LOCAL INDEX: a periodic harvest (see doabHarvest) pulls recent OAI records
 * into Firebase and this provider searches that index. The index is a
 * metadata catalog — no book files are copied; links point to the original
 * publisher PDF (CC-BY licensed in DOAB's collection).
 *
 * Book ids: doab:<handle> e.g. doab:20.500.12854/62823
 */
const { stripHtml, makeCacheHelper } = require("./baseProvider");

const OAI_DOAB = "https://directory.doabooks.org/oai/request";
const OAI_OAPEN = "https://library.oapen.org/oai/request";
const OAI_ID_RE = /oai:(directory\.doabooks\.org|library\.oapen\.org):(20\.500\.[\d.]+\/[\w.-]+)/g;

/** RTDB keys can't contain . # $ [ ] or / — use a stable short hash */
const crypto = require("crypto");
const dbKeyFor = (handle) => crypto.createHash("sha1").update(String(handle)).digest("hex").slice(0, 20);

module.exports = function createDoabProvider({ injectedCache }) {
    const cached = makeCacheHelper(injectedCache, "bk:doab", 600);
    // direct RTDB access for the local OAI index (same db instance the app uses)
    const { db, ref, get, set } = require("../../../datastore/firebase.js");
    const INDEX_PATH = "books_index/doab";

    return {
        id: "doab",
        label: "OAPEN / DOAB",
        searchable: true, // searches the local OAI index
        capabilities: { pdf: true, epub: false, html: false, embed: false, borrow: false, download: true },

        /** search the local harvested index (title/author/subject match) */
        async searchBooks(query, filters, { page = 1 }) {
            if (!query || !String(query).trim()) return { count: 0, next: null, items: [] };
            const q = stripHtml(String(query).trim().toLowerCase()).slice(0, 100);
            return cached(async () => {
                try {
                    const snap = await get(ref(db, `${INDEX_PATH}/items`));
                    const all = Object.values(snap.val() || {});
                    const terms = q.split(/\s+/).filter(Boolean).slice(0, 4);
                    const matched = all.filter((rec) => {
                        const hay = `${rec.title || ""} ${(rec.authors || []).join(" ")} ${(rec.subjects || []).join(" ")} ${rec.publisher || ""}`.toLowerCase();
                        return terms.every((t) => hay.includes(t));
                    });
                    matched.sort((a, b) => (b.harvestedAt || "").localeCompare(a.harvestedAt || ""));
                    const perPage = 24;
                    const start = (Math.max(1, Number(page)) - 1) * perPage;
                    return {
                        count: matched.length,
                        next: start + perPage < matched.length ? Number(page) + 1 : null,
                        items: matched.slice(start, start + perPage).map(normalizeRecord),
                    };
                } catch { return { count: 0, next: null, items: [] }; } // index unavailable → empty, never fake
            }, `q:${q}:p${page}`);
        },

        async getBook(providerBookId) {
            const handle = String(providerBookId).replace(/^20\.500\.[\d.]+\//, "").replace(/[^A-Za-z0-9./_-]/g, "");
            if (!handle.includes("/")) return null;
            return cached(async () => {
                try {
                    const snap = await get(ref(db, `${INDEX_PATH}/byHandle/${dbKeyFor(handle)}`));
                    const rec = snap.val();
                    return rec ? normalizeRecord(rec) : null;
                } catch { return null; }
            }, `id:${handle}`);
        },

        /**
         * Harvest one OAI ListRecords batch into the local index.
         * Called periodically by doabHarvest (or manually via admin route).
         * Returns how many NEW records were added.
         */
        async harvestBatch({ oaiUrl = OAI_DOAB, resumptionToken = null } = {}) {
            const url = resumptionToken
                ? `${oaiUrl}?verb=ListRecords&resumptionToken=${encodeURIComponent(resumptionToken)}`
                : `${oaiUrl}?verb=ListRecords&metadataPrefix=oai_dc`;
            const res = await fetch(url, { headers: { Accept: "text/xml", "User-Agent": "BayanSpace/1.0" } });
            if (!res.ok) throw new Error(`OAI ${res.status}`);
            const xml = await res.text();
            const records = parseOaiRecords(xml);
            let added = 0;
            for (const rec of records) {
                const handle = rec.identifier.split(":")[2];
                const dbKey = dbKeyFor(handle);
                const existingSnap = await get(ref(db, `${INDEX_PATH}/byHandle/${dbKey}`));
                if (existingSnap.exists()) continue;
                const value = { ...rec, handle, harvestedAt: new Date().toISOString() };
                await set(ref(db, `${INDEX_PATH}/byHandle/${dbKey}`), value);
                await set(ref(db, `${INDEX_PATH}/items/${dbKey}`), value);
                added++;
            }
            const token = (xml.match(/<resumptionToken[^>]*>([^<]*)<\/resumptionToken>/) || [])[1];
            return { added, resumptionToken: token && token.trim() ? token : null };
        },
    };
};

/** minimal OAI DC XML → records parser (no XML lib dependency) */
function parseOaiRecords(xml) {
    const out = [];
    const re = /<record[\s\S]*?<\/record>/g;
    let m;
    while ((m = re.exec(xml)) && out.length < 100) {
        const rec = m[0];
        const identifier = (rec.match(/<identifier>([^<]+)<\/identifier>/) || [])[1];
        if (!identifier || !/20\.500\./.test(identifier)) continue;
        const get = (tag) => {
            const hits = rec.match(new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)<\\/dc:${tag}>`, "g")) || [];
            return hits.map((h) => stripHtml(h.replace(/<[^>]+>/g, ""))).filter(Boolean);
        };
        const titles = get("title");
        if (!titles.length) continue;
        const pdfLink = (rec.match(/https?:\/\/[^\s<"]+\.pdf/gi) || [])[0] || null;
        const doi = (rec.match(/doi\.org\/[^\s<"]+/gi) || [])[0] || null;
        const handle = identifier.split(":")[2];
        out.push({
            identifier,
            title: titles[0].slice(0, 300),
            authors: get("creator").slice(0, 5),
            subjects: get("subject").slice(0, 6),
            publisher: get("publisher")[0] || null,
            publishedDate: get("date")[0] || null,
            language: get("language")[0] || null,
            description: (get("description")[0] || get("abstract")[0] || "").slice(0, 800) || null,
            pdfUrl: pdfLink, // publisher-hosted PDF (CC-licensed in DOAB collections)
            doi,
            sourceUrl: `https://directory.doabooks.org/handle/${handle}`,
            license: "open-access", // DOAB/OAPEN records are OA by definition
        });
    }
    return out;
}

function normalizeRecord(rec) {
    if (!rec?.handle) return null;
    return {
        provider: "doab",
        providerBookId: rec.handle,
        title: rec.title,
        authors: rec.authors || [],
        description: rec.description || null,
        cover: null, // DOAB metadata has no covers — UI shows a placeholder
        languages: rec.language ? [String(rec.language).slice(0, 3).toLowerCase()] : [],
        subjects: rec.subjects || [],
        publisher: rec.publisher || null,
        publishedDate: rec.publishedDate || null,
        doi: rec.doi || null,
        license: "open-access",
        licenseUrl: "https://directory.doabooks.org/about",
        sourceUrl: rec.sourceUrl || `https://directory.doabooks.org/handle/${rec.handle}`,
        formats: rec.pdfUrl ? { pdf: rec.pdfUrl } : {},
        downloadAllowed: Boolean(rec.pdfUrl), // publisher PDF, OA license
        fullTextAvailable: Boolean(rec.pdfUrl),
    };
}
