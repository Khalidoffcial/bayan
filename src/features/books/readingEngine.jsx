/**
 * readingEngine — unified in-site reading experience.
 *
 * Chooses the reader by ACTUAL availability (server-resolved readingSources),
 * never by URL extension:
 *   1. PDF   (public-domain only, streamed through the backend Range proxy)
 *   2. EPUB  (epub.js, only when the source authorizes it)
 *   3. HTML/text (proxied, sanitized — no third-party scripts)
 *   4. Google Books embedded viewer (honest preview labeling)
 *   5. External source (clear message; never faked in-site reading)
 *
 * The engine exposes onProgress(state) — consumers wire it to the Reading
 * Progress layer. Book data and reader rendering are fully decoupled.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBookReadContent, getBookPdfUrl, getBookEpubUrl } from "./services/books.service";
import { stripUntrustedHtml } from "./sanitize.js";
import { useTranslation } from "../../i18n/useTranslation";
import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon, MaximizeIcon, ExternalLinkIcon } from "../focus-space/constants/focusIcons";
import "./readingEngine.css";

/* ══════════ PDF reader (pdf.js, lazy-loaded) ══════════ */

export const PdfReader = ({ provider, providerBookId, initialPage = 1, onProgress }) => {
    const { t } = useTranslation();
    const [state, setState] = useState({ status: "loading", numPages: 0, page: initialPage, zoom: 1.0, error: null, query: null });
    const [searchHits, setSearchHits] = useState(null);
    const canvasRef = useRef(null);
    const docRef = useRef(null);
    const renderTaskRef = useRef(null);

    const url = getBookPdfUrl(provider, providerBookId);

    // load the document lazily — bytes arrive only when this reader mounts,
    // and pdf.js streams ranges so the whole file is never fetched up front
    useEffect(() => {
        let dead = false;
        (async () => {
            try {
                const pdfjs = await import("pdfjs-dist/build/pdf");
                pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
                const doc = await pdfjs.getDocument({ url, disableAutoFetch: true, rangeChunkSize: 65536 }).promise;
                if (dead) return;
                docRef.current = doc;
                setState((s) => ({ ...s, status: "ready", numPages: doc.numPages, page: Math.min(Math.max(1, initialPage), doc.numPages) }));
            } catch (e) {
                // common cause: source blocks embedding/range — be honest about it
                if (!dead) setState((s) => ({ ...s, status: "error", error: e?.message || "LOAD_FAILED" }));
            }
        })();
        return () => { dead = true; docRef.current = null; };
    }, [url, initialPage]);

    // render the current page
    useEffect(() => {
        const doc = docRef.current;
        const canvas = canvasRef.current;
        if (!doc || !canvas || state.status !== "ready") return;
        renderTaskRef.current?.cancel();
        let task = null;
        (async () => {
            try {
                const p = await doc.getPage(state.page);
                const viewport = p.getViewport({ scale: state.zoom });
                const ctx = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                task = p.render({ canvasContext: ctx, viewport });
                renderTaskRef.current = task;
                await task.promise;
                onProgress?.({ currentPage: state.page, totalPages: doc.numPages, progressPercent: Math.round((state.page / doc.numPages) * 100) });
            } catch (e) {
                if (e?.name !== "RenderingCancelledException") setState((s) => ({ ...s, status: "error", error: e?.message }));
            }
        })();
        return () => task?.cancel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.page, state.zoom, state.status]);

    // simple text search across pages (pdf.js getTextContent, non-blocking)
    const runSearch = useCallback(async (query) => {
        const doc = docRef.current;
        if (!doc || !query?.trim()) { setSearchHits(null); return; }
        const hits = [];
        for (let i = 1; i <= doc.numPages && hits.length < 50; i++) {
            const page = await doc.getPage(i);
            const tc = await page.getTextContent();
            const text = tc.items.map((it) => it.str).join(" ").toLowerCase();
            if (text.includes(query.toLowerCase())) hits.push(i);
        }
        setSearchHits(hits);
        if (hits.length) setState((s) => ({ ...s, page: hits[0] }));
    }, []);

    const setPageSafe = (p) => setState((s) => ({ ...s, page: Math.max(1, Math.min(s.numPages, p)) }));

    return (
        <div className="re-pdf" role="region" aria-label={t("books.pdf.viewer")}>
            <div className="re-pdf__bar">
                <button className="books-btn books-btn--ic" onClick={() => setPageSafe(state.page - 1)} disabled={state.page <= 1} aria-label={t("books.pdf.prev")}><ChevronLeftIcon size={16} strokeWidth={2} aria-hidden /></button>
                <span className="re-pdf__page">
                    <input className="re-pdf__pageInput" type="number" min={1} max={state.numPages || 1} value={state.page}
                        onChange={(e) => setPageSafe(Number(e.target.value) || 1)} aria-label={t("books.pdf.goTo")} />
                    / {state.numPages || "…"}
                </span>
                <button className="books-btn books-btn--ic" onClick={() => setPageSafe(state.page + 1)} disabled={state.page >= state.numPages} aria-label={t("books.pdf.next")}><ChevronRightIcon size={16} strokeWidth={2} aria-hidden /></button>
                <span className="re-pdf__sep" />
                <button className="books-btn books-btn--ic" onClick={() => setState((s) => ({ ...s, zoom: Math.max(0.5, +(s.zoom - 0.2).toFixed(2)) }))} aria-label={t("books.pdf.zoomOut")}><ZoomOutIcon size={15} strokeWidth={2} aria-hidden /></button>
                <button className="books-btn books-btn--ic" onClick={() => setState((s) => ({ ...s, zoom: Math.min(3, +(s.zoom + 0.2).toFixed(2)) }))} aria-label={t("books.pdf.zoomIn")}><ZoomInIcon size={15} strokeWidth={2} aria-hidden /></button>
                <button className="books-btn books-btn--ic" onClick={() => setState((s) => ({ ...s, zoom: 1 }))} aria-label={t("books.pdf.fit")}>1:1</button>
                <button className="books-btn books-btn--ic" onClick={() => canvasRef.current?.parentElement?.requestFullscreen?.()?.catch?.(() => { })} aria-label={t("books.pdf.fullscreen")}><MaximizeIcon size={14} strokeWidth={2} aria-hidden /></button>
                <span className="re-pdf__sep" />
                <input className="re-pdf__search" type="search" placeholder={t("books.pdf.search")} onKeyDown={(e) => { if (e.key === "Enter") runSearch(e.target.value); }} aria-label={t("books.pdf.search")} />
                {searchHits && <span className="re-pdf__hits">{searchHits.length ? `${searchHits.length}` : "0"} {t("books.pdf.hits")}</span>}
            </div>
            <div className="re-pdf__stage">
                {state.status === "loading" && <div className="books-state"><span className="mini-spinner" /> {t("books.pdf.loading")}</div>}
                {state.status === "error" && (
                    <div className="books-state">
                        <p>{t("books.pdf.error")}</p>
                        <a className="books-btn" href={url} target="_blank" rel="noreferrer noopener">
                            <ExternalLinkIcon size={14} strokeWidth={1.75} aria-hidden /> {t("books.openSource")}
                        </a>
                    </div>
                )}
                <canvas ref={canvasRef} className="re-pdf__canvas" style={{ display: state.status === "ready" ? "block" : "none" }} />
            </div>
        </div>
    );
};

/* ══════════ EPUB reader (epub.js lazy-loaded) ══════════ */

export const EpubReader = ({ url, initialCfi, onProgress, theme = "light" }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState(null);
    const [toc, setToc] = useState([]);
    const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("reEpubFont") || 17));
    const hostRef = useRef(null);
    const bookRef = useRef(null);
    const renditionRef = useRef(null);
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;

    useEffect(() => {
        let dead = false;
        let rendition = null;
        (async () => {
            try {
                const ePub = (await import("epubjs")).default;
                if (dead) return;
                // fetch the bytes first (through the backend proxy) and open the
                // book from an ArrayBuffer — epub.js otherwise treats the URL as
                // a directory base and requests container.xml relative to it.
                const r = await fetch(url);
                if (!r.ok) throw new Error(`EPUB_HTTP_${r.status}`);
                const buf = await r.arrayBuffer();
                if (dead) return;
                const book = ePub(buf);
                bookRef.current = book;
                try {
                    const nav = await book.loaded.navigation;
                    if (!dead) setToc((nav?.toc || []).slice(0, 100));
                } catch { /* TOC optional */ }
                if (dead || !hostRef.current) return;
                rendition = book.renderTo(hostRef.current, { width: "100%", height: "100%", flow: "paginated", spread: "auto" });
                renditionRef.current = rendition;
                rendition.themes.fontSize(`${fontSize}px`);
                rendition.on("relocated", (loc) => {
                    if (!loc) return;
                    onProgressRef.current?.({ readingFormat: "epub", currentLocation: loc.start?.cfi, progressPercent: Math.round((loc.start?.percentage || 0) * 100) });
                });
                // epub.js only paints reliably when given a concrete target —
                // same path the TOC select uses (href, not CFI)
                let target = initialCfi;
                if (!target) {
                    try {
                        const nav2 = await book.loaded.navigation;
                        target = nav2?.toc?.[0]?.href || null;
                    } catch { /* fall through */ }
                }
                await rendition.display(target || undefined);
                if (!dead) setStatus("ready");
            } catch (e) {
                if (!dead) { setStatus("error"); setError(e?.message || "EPUB_LOAD_FAILED"); }
            }
        })();
        return () => {
            dead = true;
            try { rendition?.destroy(); bookRef.current?.destroy(); } catch { /* already gone */ }
            renditionRef.current = null;
            bookRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    useEffect(() => { renditionRef.current?.themes?.fontSize?.(`${fontSize}px`); localStorage.setItem("reEpubFont", String(fontSize)); }, [fontSize]);
    useEffect(() => {
        const r = renditionRef.current;
        if (!r) return;
        if (theme === "dark") r.themes.register("dark", { body: { background: "#111827", color: "#e5e7eb" } });
        if (theme === "sepia") r.themes.register("sepia", { body: { background: "#f4ecd8", color: "#3a2f1b" } });
        if (theme === "light") r.themes.register("light", { body: { background: "#ffffff", color: "#111827" } });
        r.themes.select(theme);
    }, [theme, status]);

    if (status === "error") {
        return (
            <div className="books-state">
                <p>{t("books.epub.error")}</p>
                <a className="books-btn" href={url} target="_blank" rel="noreferrer noopener"><ExternalLinkIcon size={14} strokeWidth={1.75} aria-hidden /> EPUB</a>
            </div>
        );
    }

    return (
        <div className="re-epub">
            <div className="re-epub__bar">
                <button className="books-btn books-btn--ic" onClick={() => renditionRef.current?.prev()} aria-label={t("books.epub.prev")}><ChevronLeftIcon size={16} strokeWidth={2} aria-hidden /></button>
                <select className="re-epub__toc" defaultValue="" onChange={(e) => { if (e.target.value) renditionRef.current?.display(e.target.value); }} aria-label={t("books.epub.toc")}>
                    <option value="">{t("books.epub.toc")}</option>
                    {toc.map((c, i) => <option key={i} value={c.href}>{(c.label || c.title || "").trim().slice(0, 60)}</option>)}
                </select>
                <button className="books-btn books-btn--ic" onClick={() => renditionRef.current?.next()} aria-label={t("books.epub.next")}><ChevronRightIcon size={16} strokeWidth={2} aria-hidden /></button>
                <span className="re-pdf__sep" />
                <button className="books-btn books-btn--ic" onClick={() => setFontSize((f) => Math.max(12, f - 1))} aria-label={t("books.fontSmaller")}>A−</button>
                <span>{fontSize}</span>
                <button className="books-btn books-btn--ic" onClick={() => setFontSize((f) => Math.min(28, f + 1))} aria-label={t("books.fontBigger")}>A+</button>
                <button className="books-btn books-btn--ic" onClick={() => hostRef.current?.requestFullscreen?.()?.catch?.(() => { })} aria-label={t("books.pdf.fullscreen")}><MaximizeIcon size={14} strokeWidth={2} aria-hidden /></button>
            </div>
            {status === "loading" && <div className="books-state"><span className="mini-spinner" /> {t("books.loading")}</div>}
            {/* the host must stay in the DOM and sized while epub.js renders; it
                fades in when ready — hiding it with display:none breaks the
                iframe height computation inside epub.js */}
            <div ref={hostRef} className={`re-epub__host re-epub__host--${theme} ${status === "ready" ? "" : "re-epub__host--pending"}`} />
        </div>
    );
};

/* ══════════ HTML / plain-text reader (sanitized, RTL-aware) ══════════ */

export const HtmlTextReader = ({ provider, providerBookId, chapters = null, initialScrollPct = 0, onProgress }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState("loading");
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [font, setFont] = useState(() => Number(localStorage.getItem("reTextFont") || 18));
    const [theme, setTheme] = useState(() => localStorage.getItem("reTextTheme") || "light");
    const [restored, setRestored] = useState(false);
    const [activeChapter, setActiveChapter] = useState(null); // chapter path | null
    const bodyRef = useRef(null);
    const lastPctRef = useRef(0);

    // chapter-aware read id: ws:lang:Title/Chapter — providers accept both forms
    const readId = chapters?.length && activeChapter ? `${providerBookId}/${activeChapter}` : providerBookId;

    useEffect(() => {
        let dead = false;
        (async () => {
            const r = await getBookReadContent(provider, readId);
            if (dead) return;
            if (r.ok) { setData(r); setStatus("ready"); }
            else { setError(r.error); setStatus("error"); }
        })();
        return () => { dead = true; };
    }, [provider, readId]);

    // restore last scroll position once content is in the DOM
    useEffect(() => {
        if (status !== "ready" || !bodyRef.current || restored) return;
        setRestored(true);
        if (initialScrollPct > 0 && initialScrollPct < 100) {
            requestAnimationFrame(() => {
                const el = bodyRef.current;
                if (!el) return;
                el.scrollTop = (initialScrollPct / 100) * (el.scrollHeight - el.clientHeight);
                lastPctRef.current = initialScrollPct;
            });
        }
    }, [status, initialScrollPct, restored]);

    // debounced scroll-progress saving (≥5% jumps only)
    useEffect(() => {
        const el = bodyRef.current;
        if (!el || status !== "ready") return;
        let timer = null;
        const onScroll = () => {
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                const max = el.scrollHeight - el.clientHeight;
                if (max <= 0) return;
                const pct = Math.round(Math.min(100, (el.scrollTop / max) * 100));
                if (Math.abs(pct - lastPctRef.current) >= 5) {
                    lastPctRef.current = pct;
                    onProgress?.({ scrollPosition: pct, progressPercent: pct });
                }
            }, 700);
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => { el.removeEventListener("scroll", onScroll); if (timer) clearTimeout(timer); };
    }, [status, onProgress]);

    // content direction from the dominant script — Arabic books read RTL
    const dir = useMemo(() => {
        const sample = data?.format === "text"
            ? (data.content || "").slice(0, 2000)
            : (data?.content || "").replace(/<[^>]+>/g, " ").slice(0, 2000);
        return sample ? (/[\u0600-\u06FF]/.test(sample) ? "rtl" : "ltr") : null;
    }, [data]);

    if (status === "error") return <div className="books-state"><p>{t("books.readError")}</p></div>;

    return (
        <div className={`re-text re-text--${theme}`} dir={dir || undefined}>
            <div className="re-text__bar">
                <button className="books-btn books-btn--ic" onClick={() => setFont((f) => Math.max(14, f - 1))} aria-label={t("books.fontSmaller")}>A−</button>
                <span>{font}</span>
                <button className="books-btn books-btn--ic" onClick={() => setFont((f) => Math.min(28, f + 1))} aria-label={t("books.fontBigger")}>A+</button>
                {Array.isArray(chapters) && chapters.length > 0 && (
                    <select className="re-epub__toc" defaultValue="" aria-label={t("books.epub.toc")}
                        onChange={(e) => { if (e.target.value) { setActiveChapter(e.target.value); setRestored(false); lastPctRef.current = 0; } }}>
                        <option value="">{t("books.epub.toc")}</option>
                        {chapters.map((c) => (
                            <option key={c.path} value={c.path.replace(/^.*\//, "")}>{c.title}</option>
                        ))}
                    </select>
                )}
                {Array.isArray(chapters) && chapters.length > 0 && activeChapter && (
                    <button className="books-btn books-btn--ic" onClick={() => { setActiveChapter(null); setRestored(false); }} aria-label={t("books.indexPage")}>
                        {t("books.indexPage")}
                    </button>
                )}
                {["light", "sepia", "dark"].map((th) => (
                    <button key={th} className={`books-btn books-btn--ic re-text__theme ${theme === th ? "active" : ""}`} onClick={() => { setTheme(th); localStorage.setItem("reTextTheme", th); }} aria-label={th}>
                        {th === "light" ? <BookOpenIcon size={14} strokeWidth={1.75} aria-hidden /> : th === "sepia" ? "☾" : "◐"}
                    </button>
                ))}
            </div>
            {status === "loading" && <div className="books-state"><span className="mini-spinner" /> {t("books.loading")}</div>}
            <div className="re-text__body" ref={bodyRef} style={{ fontSize: `${font}px` }}>
                {data?.format === "html" && <div className="re-text__content" dangerouslySetInnerHTML={{ __html: stripUntrustedHtml(data.content) }} />}
                {data?.format === "text" && <div className="re-text__content re-text__content--plain" style={{ whiteSpace: "pre-wrap" }}>{data.content}</div>}
            </div>
        </div>
    );
};

/* ══════════ Google Books embedded viewer ══════════ */

export const GoogleBooksViewer = ({ volumeId, previewOnly, onProgress }) => {
    const { t } = useTranslation();
    const hostRef = useRef(null);
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;

    useEffect(() => {
        let cancelled = false;
        const fail = () => {
            if (cancelled || !hostRef.current) return;
            hostRef.current.innerHTML = `<div class="books-state"><p>${t("books.gb.unavailable")}</p></div>`;
        };
        const init = () => {
            if (cancelled || !window.google?.books || !hostRef.current) return;
            try {
                const viewer = new window.google.books.DefaultViewer(hostRef.current);
                viewer.load(volumeId, undefined, () => fail());
                viewer.addListener?.("pagedown", () => onProgressRef.current?.({ viewerPage: "down" }));
            } catch { fail(); }
        };
        if (window.google?.books) {
            window.google.books.load();
            window.google.books.setOnLoadCallback(init);
            return () => { cancelled = true; };
        }
        // loader script — <script> tag (no CORS involvement)
        const s = document.createElement("script");
        s.src = "https://books.google.com/books/jsapi.js";
        s.async = true;
        s.onerror = fail;
        const loadTimer = setTimeout(() => { if (!window.google?.books) fail(); }, 15000);
        s.onload = () => {
            window.google.books.load();
            window.google.books.setOnLoadCallback(init);
        };
        document.head.appendChild(s);
        return () => { cancelled = true; clearTimeout(loadTimer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volumeId]);

    return (
        <div className="re-gb">
            {previewOnly && <div className="re-gb__notice"><BookOpenIcon size={14} strokeWidth={1.75} aria-hidden /> {t("books.gb.previewOnly")}</div>}
            <div ref={hostRef} className="re-gb__host" />
        </div>
    );
};

/* ══════════ External-source fallback ══════════ */

export const ExternalSourceNotice = ({ url, borrowOnly, label }) => {
    const { t } = useTranslation();
    return (
        <div className="books-state">
            <p>{borrowOnly ? t("books.borrowOnly") : t("books.externalOnly")}</p>
            <a className="books-btn books-btn--primary" href={url} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon size={14} strokeWidth={1.75} aria-hidden /> {label || t("books.readOnSource")}
            </a>
        </div>
    );
};

/* ══════════ Reader resolver — picks the reader from actual availability ══════════ */

export const ReadingEngine = ({ book, readingSources, initialProgress, onProgress, theme }) => {
    const { t } = useTranslation();
    const sources = readingSources?.length ? readingSources : [];
    const pick = (kind) => sources.find((s) => s.kind === kind);

    if (!sources.length) return <div className="books-state"><p>{t("books.noReadingOption")}</p></div>;

    const pdf = pick("pdf");
    if (pdf) return <PdfReader provider={book.provider} providerBookId={book.providerBookId} initialPage={initialProgress?.currentPage || 1} onProgress={onProgress} />;

    const epub = pick("epub");
    if (epub) {
        // proxied URL — the direct source URL has no CORS; the backend streams it
        const streamUrl = epub.proxied ? getBookEpubUrl(book.provider, book.providerBookId) : epub.url;
        return <EpubReader url={streamUrl} initialCfi={initialProgress?.currentLocation} onProgress={onProgress} theme={theme} />;
    }

    const html = pick("html");
    if (html && (book.provider === "gutenberg" || book.provider === "wikisource")) {
        return <HtmlTextReader provider={book.provider} providerBookId={book.providerBookId} chapters={book.chapters || null} initialScrollPct={initialProgress?.scrollPosition || 0} onProgress={onProgress} />;
    }

    const embed = pick("embed");
    if (embed) return <GoogleBooksViewer volumeId={embed.volumeId || book.providerBookId} previewOnly={embed.previewOnly} onProgress={onProgress} />;

    const external = pick("external");
    if (external) return <ExternalSourceNotice url={external.url} borrowOnly={external.borrowOnly} label={external.label} />;

    return <div className="books-state"><p>{t("books.noReadingOption")}</p></div>;
};

export default ReadingEngine;
