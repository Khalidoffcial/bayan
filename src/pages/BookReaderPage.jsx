/**
 * BookReaderPage — read a book inside Bayan Space.
 *
 * The page is a thin shell around the Reading Engine: it loads book details
 * (+ server-resolved readingSources), restores reading progress, wires
 * save/complete actions through the existing savedContent system, and renders
 * the right reader (PDF/EPUB/HTML/Google-Books/external) via the engine.
 * Header/sidebar/navigation behave exactly like other Bayan reading pages.
 */
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useTranslation } from "../i18n/useTranslation";
import useAuth from "../hooks/useAuth";
import { useToast } from "../components/ui/Toast";
import { getBook, getBookPdfUrl } from "../features/books/services/books.service";
import { useBookProgress } from "../features/books/hooks/useBookProgress";
import { ReadingEngine } from "../features/books/readingEngine";
import { toggleReadLater, getSavedStatus } from "../features/focus-space/services/savedContent.service";
import { DownloadIcon, ExternalLinkIcon } from "../features/focus-space/constants/focusIcons";
import "../features/books/components/books.css";
import "../features/books/readingEngine.css";
import "../features/feed/styles/feed.css"; // .feed-container/.feed-main live here

const ACCESS_LABEL = { full: "books.access.full", borrow: "books.access.borrow", readonline: "books.access.readonline", metadata: "books.access.metadata" };

export const BookReaderPage = () => {
    const { provider, providerBookId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const toast = useToast();

    const stateBook = location.state?.book;
    const [book, setBook] = useState(stateBook || null);
    const [sources, setSources] = useState(location.state?.readingSources || null);
    const [status, setStatus] = useState(stateBook ? "ready" : "loading");
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    const { initialProgress, restored, reportProgress, markCompleted } = useBookProgress({ provider, providerBookId, enabled: status === "ready" });

    /* ── load book details once (never per render) ── */
    useEffect(() => {
        if (stateBook && sources) return; // fully hydrated from navigation state
        let dead = false;
        (async () => {
            const r = await getBook(provider, providerBookId);
            if (dead) return;
            if (r.ok) {
                setBook(r.book);
                setSources(r.book.readingSources || []);
                setStatus("ready");
            } else {
                setError(r.error);
                setStatus("error");
            }
        })();
        return () => { dead = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider, providerBookId]);

    /* ── saved-list state (server truth) ── */
    useEffect(() => {
        let dead = false;
        if (!user?.id || !provider || !providerBookId) return;
        getSavedStatus({ contentId: `${provider}__${providerBookId}`, contentType: "books" }).then((r) => {
            if (!dead && r.ok) setSaved(Boolean(r.saved));
        });
        return () => { dead = true; };
    }, [user?.id, provider, providerBookId]);

    const saveBook = async () => {
        if (!user?.id) { toast.info(t("readLater.loginRequired")); return; }
        const r = await toggleReadLater({
            contentId: `${provider}__${providerBookId}`,
            contentType: "books",
            title: book?.title,
            image: book?.cover,
        });
        if (r.ok) {
            setSaved(r.saved);
            toast.success(r.saved ? t("readLater.saved") : t("readLater.removed"));
        } else toast.error(t("readLater.failed"));
    };

    const complete = async () => {
        const r = await markCompleted();
        if (r?.ok) toast.success(t("readLater.markedCompleted"));
    };

    const pdfSource = sources?.find((s) => s.kind === "pdf");
    const hasProgress = (initialProgress?.progressPercent || 0) > 0 && (initialProgress?.progressPercent || 0) < 100;

    return (
        <AppLayout>
            <div className="feed-main br-page">
                {status === "loading" && <div className="books-state"><span className="mini-spinner" /> {t("books.loading")}</div>}
                {status === "error" && (
                    <div className="books-state">
                        <p>{t("books.error.load")}</p>
                        <button className="books-btn" onClick={() => navigate(-1)}>{t("common.back")}</button>
                    </div>
                )}
                {book && (
                    <>
                        <div className="br-head">
                            <button className="books-btn" onClick={() => navigate("/books")}>{t("common.back")}</button>
                            <div className="br-head__meta">
                                <h1>{book.titleKey ? t(book.titleKey) : book.title}</h1>
                                <p>{(book.authors || []).join(", ") || t("books.unknownAuthor")}{book.publishedDate ? ` · ${book.publishedDate}` : ""}</p>
                                <p className="br-head__src">
                                    {t("books.sourceLabel")}: {book.provider}
                                    {book.license === "public-domain" && ` · ${t("books.publicDomain")}`}
                                    {book.license === "open-access" && " · Open Access"}
                                    {book.accessLevel === "borrow" && ` · ${t("books.borrowNote")}`}
                                </p>
                            </div>
                            <div className="br-head__actions">
                                <button className="books-btn" onClick={saveBook}>{saved ? t("books.saved") : t("books.save")}</button>
                                {saved && hasProgress && <button className="books-btn" onClick={complete}>{t("books.markCompleted")}</button>}
                                {/* download only where the provider authorizes it */}
                                {pdfSource?.canDownload && (
                                    <a className="books-btn" href={getBookPdfUrl(provider, providerBookId)} download>
                                        <DownloadIcon size={14} strokeWidth={1.75} aria-hidden /> PDF
                                    </a>
                                )}
                                {book.formats?.epub && book.downloadAllowed && (
                                    <a className="books-btn" href={book.formats.epub} target="_blank" rel="noreferrer noopener">
                                        <DownloadIcon size={14} strokeWidth={1.75} aria-hidden /> EPUB
                                    </a>
                                )}
                                {book.sourceUrl && (
                                    <a className="books-btn" href={book.sourceUrl} target="_blank" rel="noreferrer noopener">
                                        <ExternalLinkIcon size={14} strokeWidth={1.75} aria-hidden /> {t("books.openSource")}
                                    </a>
                                )}
                            </div>
                        </div>

                        {restored && hasProgress && (
                            <div className="br-progress-resume">
                                {t("books.progress", { n: initialProgress.progressPercent })}
                            </div>
                        )}

                        {/* the engine picks PDF → EPUB → HTML/text → Google → external */}
                        <ReadingEngine
                            book={book}
                            readingSources={sources || []}
                            initialProgress={initialProgress}
                            onProgress={reportProgress}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default React.memo(BookReaderPage);
