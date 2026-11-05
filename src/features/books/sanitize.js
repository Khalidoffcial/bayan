/**
 * sanitize.js — untrusted third-party HTML → safe presentational HTML.
 *
 * Gutenberg/Wikisource content is user-contributed and historic: scripts,
 * event handlers, iframes and external resource loads must never run inside
 * Bayan. This is a conservative allowlist sanitizer (DOMParser-based), not a
 * full HTML5 sanitizer — if the project later adds DOMPurify, swap the body.
 */

const ALLOWED_TAGS = new Set([
    "p", "div", "span", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code", "em", "strong", "b", "i",
    "u", "s", "small", "sup", "sub", "table", "thead", "tbody", "tr", "th",
    "td", "caption", "figure", "figcaption", "section", "article", "aside",
    "nav", "header", "footer", "a", "img", "picture", "source", "ruby", "rt", "rp",
]);

const ALLOWED_ATTRS = new Set(["href", "src", "srcset", "alt", "title", "colspan", "rowspan", "dir", "lang", "class", "id", "width", "height"]);

/** rewrite relative + protocol-relative URLs against the source origin */
function absolutize(value, base) {
    if (!value) return value;
    try {
        if (value.startsWith("//")) return `https:${value}`;
        return new URL(value, base).href;
    } catch { return value; }
}

export function stripUntrustedHtml(html, sourceOrigin = "https://www.gutenberg.org") {
    if (!html) return "";
    let doc;
    try {
        doc = new DOMParser().parseFromString(String(html), "text/html");
    } catch {
        return "";
    }
    const walk = (node) => {
        for (const child of [...node.children]) {
            const tag = child.tagName.toLowerCase();
            // scripts, styles, embeds, forms: removed entirely
            if (!ALLOWED_TAGS.has(tag) || ["script", "style", "iframe", "object", "embed", "form", "link", "meta"].includes(tag)) {
                if (tag === "svg" || tag === "math") { child.remove(); continue; }
                // unwrap unknown-but-harmless containers instead of dropping content
                if (!["script", "style", "iframe", "object", "embed", "form", "link", "meta"].includes(tag)) {
                    const parent = child.parentNode;
                    while (child.firstChild) parent.insertBefore(child.firstChild, child);
                    child.remove();
                    continue;
                }
                child.remove();
                continue;
            }
            for (const attr of [...child.attributes]) {
                const name = attr.name.toLowerCase();
                const val = attr.value || "";
                const isUrl = name === "href" || name === "src" || name === "srcset";
                if (!ALLOWED_ATTRS.has(name) || name.startsWith("on") || (isUrl && /^\s*javascript:/i.test(val))) {
                    child.removeAttribute(attr.name);
                    continue;
                }
                if (isUrl) child.setAttribute(name, absolutize(val.trim(), sourceOrigin));
            }
            // links from third-party pages open externally, never navigate inside Bayan
            if (tag === "a") {
                const href = child.getAttribute("href") || "";
                if (!/^https?:/i.test(href)) child.removeAttribute("href");
                else { child.setAttribute("target", "_blank"); child.setAttribute("rel", "noreferrer noopener"); }
            }
            walk(child);
        }
    };
    walk(doc.body);
    // remove <head> remnants entirely — only body content is served
    const headJunk = doc.body.querySelectorAll("style, script");
    headJunk.forEach((n) => n.remove());
    return doc.body.innerHTML;
}

export default stripUntrustedHtml;
