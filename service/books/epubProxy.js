/**
 * books/epubProxy.js — safe same-origin EPUB streaming.
 *
 * Serves EPUB files ONLY for sources that authorize downloads and ONLY from
 * an allowlist of verified hosts. This is both a legal control (no random
 * file URLs, DRM/borrow items never reach this path) and an SSRF guard
 * (private IPs, localhost and non-http schemes are refused before any
 * upstream request is made).
 */
const net = require("net");
const dns = require("dns").promises;

/** hosts we are allowed to stream from — must match verified providers */
const ALLOWED_HOSTS = new Set([
    "www.gutenberg.org",
    "gutenberg.org",
]);

/** resolve a hostname → refuse private/loopback/link-local addresses (SSRF) */
async function isPublicHost(hostname) {
    if (ALLOWED_HOSTS.size && !ALLOWED_HOSTS.has(hostname)) return false;
    try {
        const records = await dns.lookup(hostname, { all: true });
        for (const { address } of records) {
            if (net.isIPv4(address) || net.isIPv6(address)) {
                if (
                    address === "0.0.0.0" ||
                    address.startsWith("10.") ||
                    address.startsWith("192.168.") ||
                    address.startsWith("169.254.") ||
                    address.startsWith("127.") ||
                    address.startsWith("fc") || address.startsWith("fd") ||
                    address === "::1"
                ) return false;
            }
        }
        return records.length > 0;
    } catch {
        return false; // unresolvable host → refuse
    }
}

/**
 * GET /books/:provider/:id/epub — verified EPUB byte stream.
 * Access is re-verified against the provider before a single byte leaves.
 */
async function epubProxyHandler(req, res, { getBook, providers }) {
    try {
        const { provider, providerBookId } = req.params;
        const book = await getBook(provider, providerBookId);
        if (!book) return res.status(404).json({ status: "error", message: "BOOK_NOT_FOUND" });
        if (!book.downloadAllowed || !book.formats?.epub) {
            return res.status(403).json({ status: "error", message: "DOWNLOAD_NOT_AUTHORIZED" });
        }
        let url;
        try { url = new URL(book.formats.epub); } catch { return res.status(400).json({ status: "error", message: "INVALID_SOURCE_URL" }); }
        if (url.protocol !== "https:") return res.status(400).json({ status: "error", message: "HTTPS_ONLY" });
        if (!(await isPublicHost(url.hostname))) return res.status(403).json({ status: "error", message: "HOST_NOT_ALLOWED" });

        const upstream = await fetch(url, {
            headers: { Accept: "application/epub+zip", "User-Agent": "BayanSpace/1.0" },
            redirect: "follow",
        });
        if (!upstream.ok) return res.status(502).json({ status: "error", message: `UPSTREAM_${upstream.status}` });

        const ct = upstream.headers.get("content-type") || "application/epub+zip";
        if (!/epub|zip|octet-stream/i.test(ct)) return res.status(502).json({ status: "error", message: "NOT_AN_EPUB" });
        const len = Number(upstream.headers.get("content-length"));
        if (Number.isFinite(len) && len > 60 * 1024 * 1024) return res.status(413).json({ status: "error", message: "FILE_TOO_LARGE" });

        res.writeHead(200, {
            "Content-Type": "application/epub+zip",
            ...(Number.isFinite(len) ? { "Content-Length": len } : {}),
            "Cache-Control": "public, max-age=86400",
        });
        if (typeof upstream.body?.pipe === "function") {
            upstream.body.pipe(res);
            upstream.body.on("error", () => res.destroy());
        } else {
            const { Readable } = require("stream");
            Readable.fromWeb(upstream.body).pipe(res);
        }
        req.on("close", () => { try { upstream.body?.destroy?.(); } catch { /* gone */ } });
    } catch (err) {
        console.error("GET /books/:provider/:id/epub error:", err.message);
        if (!res.headersSent) res.status(500).json({ status: "error", message: err.message });
        else res.destroy();
    }
}

module.exports = { epubProxyHandler, isPublicHost, ALLOWED_HOSTS };
