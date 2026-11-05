/**
 * BooksPage — discovery page for free & legally-readable books.
 *
 * Layout mirrors the Articles/Novels feed exactly (same .feed-container,
 * .feed-main content width). Results come from the unified backend registry
 * (Gutenberg, Open Library, Google Books, Wikisource, Internet Archive,
 * DOAB/OAPEN) — normalized and deduped server-side. No mock data.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import Top from "../components/layout/Top";
import Sidebar from "../components/layout/Sidebar";
import InterestsPopup from "../components/common/InterestsModal";
import { useTranslation } from "../i18n/useTranslation";
import { useSettings } from "../contexts/SettingsContext";
import { searchBooks } from "../features/books/services/books.service";
import { BookCard, BookSkeleton } from "../features/books/components/BookCard";
import AdSidebar from "../features/ads/AdSidebar";
import "../features/books/components/books.css";
import "../features/feed/styles/feed.css"; // .feed-container/.feed-main live here

const LANGS = [
    { code: "", label: "books.lang.any" },
    { code: "en", label: "books.lang.en" },
    { code: "ar", label: "books.lang.ar" },
    { code: "fr", label: "books.lang.fr" },
    { code: "de", label: "books.lang.de" },
    { code: "es", label: "books.lang.es" },
    { code: "it", label: "books.lang.it" },
    { code: "ru", label: "books.lang.ru" },
];

const SOURCES = [
    { code: "", label: "books.source.any" },
    { code: "gutenberg", label: "books.source.gutenberg" },
    { code: "openlibrary", label: "books.source.openlibrary" },
    { code: "googlebooks", label: "Google Books" },
    { code: "wikisource", label: "Wikisource" },
    { code: "internetarchive", label: "Internet Archive" },
    { code: "doab", label: "OAPEN / DOAB" },
];

export const BooksPage = () => {
    const { t } = useTranslation();
    const { language } = useSettings();
    const [raw, setRaw] = useState("");
    const [query, setQuery] = useState("");
    const [lang, setLang] = useState("");
    const [source, setSource] = useState("");
    const [yearFrom, setYearFrom] = useState("");
    const [author, setAuthor] = useState("");
    const [isbn, setIsbn] = useState("");
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [nextPage, setNextPage] = useState(null);
    const [status, setStatus] = useState("idle"); // idle | loading | done | error
    const [error, setError] = useState(null);
    const debounceRef = useRef(null);
    const reqIdRef = useRef(0);

    // debounced search — the raw input updates instantly, query lags 500ms
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setQuery(raw.trim()); setPage(1); }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [raw]);

    const filtersKey = `${lang}|${source}|${yearFrom}|${author}|${isbn}`;

    const load = useCallback(async (q, p, append) => {
        const reqId = ++reqIdRef.current;
        setStatus(append ? "loading-more" : "loading");
        const res = await searchBooks({
            q,
            language: lang || undefined,
            yearFrom: yearFrom || undefined,
            yearTo: yearFrom ? new Date().getFullYear() : undefined,
            author: author || undefined,
            isbn: isbn || undefined,
            sources: source ? [source] : undefined,
            page: p,
        });
        if (reqId !== reqIdRef.current) return; // superseded by a newer request
        if (res.ok) {
            setItems((prev) => (append ? [...prev, ...res.items] : res.items));
            setTotal(res.count || 0);
            setNextPage(res.next);
            setError(res.errors?.length && !res.items.length ? res.errors[0] : null);
            setStatus("done");
        } else {
            setError(res.error);
            setStatus("error");
        }
    }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load(query, page, false);
    }, [query, filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const clearAll = () => { setRaw(""); setLang(""); setSource(""); setYearFrom(""); setAuthor(""); setIsbn(""); };
    const hasFilters = Boolean(lang || source || yearFrom || author || isbn);

    const loadMore = () => {
        if (!nextPage || status === "loading-more") return;
        const p = page + 1;
        setPage(p);
        load(query, p, true);
    };

    const isArabic = language === "ar";

    return (
        <div className="feed-container" dir={isArabic ? "rtl" : "ltr"}>
            <Top />
            <Sidebar />
            <InterestsPopup />
            <AdSidebar />
            <div className="feed-main">
                <header className="books-head">
                    <h1>{t("books.title")}</h1>
                    <p>{t("books.subtitle")}</p>
                </header>

                <div className="books-search">
                    <SearchIconWrap />
                    <input
                        type="search"
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                        placeholder={t("books.searchPlaceholder")}
                        aria-label={t("books.searchPlaceholder")}
                    />
                    {raw && (
                        <button className="books-clear" onClick={() => setRaw("")} aria-label={t("common.clear")}>×</button>
                    )}
                </div>

                <div className="books-filters">
                    <select value={lang} onChange={(e) => { setLang(e.target.value); setPage(1); }} aria-label={t("books.filter.language")}>
                        {LANGS.map((l) => <option key={l.code} value={l.code}>{t(l.label)}</option>)}
                    </select>
                    <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} aria-label={t("books.filter.source")}>
                        {SOURCES.map((s) => <option key={s.code} value={s.code}>{t(s.label)}</option>)}
                    </select>
                    <input className="books-filter-input" type="text" inputMode="numeric" placeholder="ISBN" value={isbn}
                        onChange={(e) => { setIsbn(e.target.value); setPage(1); }} aria-label="ISBN" />
                    <input className="books-filter-input" type="text" placeholder={t("books.filter.author")} value={author}
                        onChange={(e) => { setAuthor(e.target.value); setPage(1); }} aria-label={t("books.filter.author")} />
                    <input className="books-filter-input books-filter-year" type="number" placeholder={t("books.filter.yearFrom")} value={yearFrom}
                        min="1400" max={new Date().getFullYear()}
                        onChange={(e) => { setYearFrom(e.target.value); setPage(1); }} aria-label={t("books.filter.yearFrom")} />
                    {hasFilters && (
                        <button className="books-clear-filters" onClick={clearAll}>{t("books.clearFilters")}</button>
                    )}
                </div>

                {status === "loading" && (
                    <div className="books-grid">
                        {Array.from({ length: 12 }).map((_, i) => <BookSkeleton key={i} />)}
                    </div>
                )}

                {status === "error" && (
                    <div className="books-state">
                        <p>{t("books.error.load")}</p>
                        <button className="books-btn" onClick={() => load(query, page, false)}>{t("common.retry")}</button>
                    </div>
                )}

                {status === "done" && items.length === 0 && (
                    <div className="books-state">
                        <p>{source === "doab" && !error ? t("books.doabIndexing") : t("books.empty")}</p>
                        {hasFilters && <button className="books-btn" onClick={clearAll}>{t("books.clearFilters")}</button>}
                    </div>
                )}

                {status === "done" && items.length > 0 && (
                    <>
                        {error && <div className="books-quota-note">{t("books.quotaNote")}</div>}
                        <div className="books-grid">
                            {items.map((b) => <BookCard key={`${b.provider}:${b.providerBookId}`} book={b} />)}
                        </div>
                        {nextPage && (
                            <div className="books-more">
                                <button className="books-btn" disabled={status === "loading-more"} onClick={loadMore}>
                                    {status === "loading-more" ? <span className="mini-spinner" /> : t("books.loadMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/** inline search glyph (pure CSS — no emoji, no asset) */
const SearchIconWrap = () => <span className="books-search__ic" aria-hidden />;

export default React.memo(BooksPage);
