/**
 * BookCard — a book rendered with the SAME Box visual language as the
 * Articles/Novels feed cards (.box). No new card system: same radius,
 * shadow, padding, typography, hover. Cover aspect ratio fixed.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../../i18n/useTranslation";
import { BookOpenIcon, DownloadIcon, InfoIcon } from "../../focus-space/constants/focusIcons";
import "./books.css";

const ACCESS_BADGE = {
    full: "books.access.full",
    borrow: "books.access.borrow",
    readonline: "books.access.readonline",
    metadata: "books.access.metadata",
};

export const BookCard = ({ book }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const canDownload = Boolean(book.downloadAllowed && (book.formats?.pdf || book.formats?.epub));
    const readable = Boolean(book.fullTextAvailable || book.formats?.html || book.formats?.epub);

    const open = () => navigate(`/books/${encodeURIComponent(book.provider)}/${encodeURIComponent(book.providerBookId)}`, { state: { book, readingSources: book.readingSources } });

    return (
        <article className="box book-card" onClick={open}>
            <span className={`book-card__access book-card__access--${book.accessLevel || (book.fullTextAvailable ? "full" : "metadata")}`}>
                {t(ACCESS_BADGE[book.accessLevel || (book.fullTextAvailable ? "full" : "metadata")] || ACCESS_BADGE.metadata)}
            </span>
            <div className="book-card__cover-wrap">
                {book.cover
                    ? <img className="book-card__cover" src={book.cover} alt="" width="300" height="450" decoding="async" loading="lazy" />
                    : <span className="book-card__cover book-card__cover--ph"><BookOpenIcon size={34} strokeWidth={1.4} aria-hidden /></span>}
            </div>
            <h1 className="book-card__title">{book.title}</h1>
            <p className="book-card__author">{(book.authors || []).slice(0, 2).join(", ") || "—"}</p>
            <div className="book-card__meta">
                {book.publishedDate && <span>{String(book.publishedDate).slice(0, 4)}</span>}
                {(book.languages || []).slice(0, 2).map((l) => <span key={l} className="book-card__lang">{l}</span>)}
                <span className="book-card__lang book-card__src">{book.provider}</span>
            </div>
            <div className="book-card__actions" onClick={(e) => e.stopPropagation()}>
                {readable && (
                    <button className="books-btn books-btn--primary" onClick={open}>
                        <BookOpenIcon size={14} strokeWidth={1.75} aria-hidden /> {t("books.read")}
                    </button>
                )}
                {canDownload && (
                    <a className="books-btn" href={`/books/${encodeURIComponent(book.provider)}/${encodeURIComponent(book.providerBookId)}`} onClick={(e) => e.preventDefault()} title={t("books.download")} aria-label={t("books.download")}>
                        <DownloadIcon size={14} strokeWidth={1.75} aria-hidden />
                    </a>
                )}
                {!readable && !canDownload && (
                    <span className="book-card__metaonly"><InfoIcon size={13} strokeWidth={1.75} aria-hidden /> {t("books.metadataOnly")}</span>
                )}
            </div>
        </article>
    );
};

export const BookSkeleton = () => (
    <div className="box book-card book-card--skeleton" aria-hidden>
        <div className="book-card__cover-wrap"><span className="book-card__cover book-card__cover--ph" /></div>
        <div className="sk-line sk-line--title" />
        <div className="sk-line" />
        <div className="sk-line sk-line--short" />
    </div>
);

export default React.memo(BookCard);
