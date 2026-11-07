/**
 * FocusSavedReader — reads the user's REAL saved content inside Focus Space.
 *
 * - Content comes from /focus-space/saved-content/:type/:id/full — the server
 *   serves the ORIGINAL article/novel/post record (never a demo copy), and
 *   only when the item is in THIS user's read-later list.
 * - Read position is saved to the existing savedContent record
 *   (readProgressPercent + lastReadAt via PUT /read-later) — debounced,
 *   on scroll and on leaving the reader.
 * - Reaching the bottom is never auto-completion: the user confirms
 *   "Completed" themselves.
 * - Back returns to the Read Later list without losing the position (it was
 *   persisted server-side the whole time).
 * - Comfortable reading: font-size + background controls, RTL/LTR by content.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import Loader from "../../../components/ui/Loader";
import { useToast } from "../../../components/ui/Toast";
import { CloseIcon } from "../constants/focusIcons";
import { fetchSavedContentFull, updateReadProgress } from "../services/savedContent.service";
import "./focusSavedReader.css";

const TYPE_LABEL = { articles: "article", novels: "novel", posts: "post" };

export const FocusSavedReader = ({ item, onBack }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("focusReaderFont") || 17));
  const [theme, setTheme] = useState(() => localStorage.getItem("focusReaderTheme") || "dark");
  const [marking, setMarking] = useState(false);
  const bodyRef = useRef(null);
  const lastSavedPctRef = useRef(0);
  const itemRef = useRef(item);
  itemRef.current = item;

  /* ── load the real content once ── */
  useEffect(() => {
    let dead = false;
    setLoading(true);
    setError(null);
    fetchSavedContentFull({ contentId: item.contentId, contentType: item.contentType }).then((r) => {
      if (dead) return;
      setLoading(false);
      if (!r.ok) { setError(r.error || "NOT_FOUND"); return; }
      setContent(r.content);
    });
    return () => { dead = true; };
  }, [item.contentId, item.contentType]);

  /* ── start from the last saved position ── */
  useEffect(() => {
    if (!content || !bodyRef.current) return;
    const savedPct = Number(item.readProgressPercent) || 0;
    if (savedPct > 0 && savedPct < 100) {
      const el = bodyRef.current;
      requestAnimationFrame(() => {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = Math.max(0, (savedPct / 100) * max);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  /* ── debounced progress saving (never per scroll tick) ── */
  const saveProgress = useCallback((pct) => {
    const it = itemRef.current;
    if (!it) return;
    updateReadProgress({
      contentId: it.contentId,
      contentType: it.contentType,
      readProgressPercent: pct,
      readStatus: pct >= 99 && it.readStatus === "completed" ? "completed" : "in_progress",
    });
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !content) return;
    let timer = null;
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return;
        const pct = Math.round(Math.min(100, (el.scrollTop / max) * 100));
        // save only meaningful jumps (>= 5%) to avoid request spam
        if (Math.abs(pct - lastSavedPctRef.current) >= 5) {
          lastSavedPctRef.current = pct;
          saveProgress(pct);
        }
      }, 700);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [content, saveProgress]);

  /* ── save the final position when leaving ── */
  const handleBack = useCallback(() => {
    const el = bodyRef.current;
    if (el && content) {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.round(Math.min(100, (el.scrollTop / max) * 100)) : 0;
      if (pct !== lastSavedPctRef.current) {
        lastSavedPctRef.current = pct;
        saveProgress(pct);
      }
    }
    onBack();
  }, [content, onBack, saveProgress]);

  const markCompleted = async () => {
    if (marking) return;
    setMarking(true);
    const result = await updateReadProgress({
      contentId: item.contentId,
      contentType: item.contentType,
      readStatus: "completed",
      readProgressPercent: 100,
    });
    setMarking(false);
    if (result.ok) toast.success(t("readLater.markedCompleted"));
    else toast.error(t("readLater.failed"));
  };

  const setFont = (v) => {
    setFontSize(v);
    try { localStorage.setItem("focusReaderFont", String(v)); } catch { /* ignore */ }
  };
  const setBg = (v) => {
    setTheme(v);
    try { localStorage.setItem("focusReaderTheme", v); } catch { /* ignore */ }
  };

  const dir = content
    ? /[\u0600-\u06FF]/.test(String(content.content || content.title || "")) ? "rtl" : "ltr"
    : "ltr";

  return (
    <div className={`fsr fsr--${theme}`} role="dialog" aria-label={t("focus.saved.continue")}>
      <div className="fsr__bar">
        <button className="fsr__back" onClick={handleBack} aria-label={t("feed.back")}>
          ← {t("feed.back")}
        </button>
        <div className="fsr__controls">
          <button className="fsr__chip" onClick={() => setFont(Math.max(14, fontSize - 1))} aria-label={t("readLater.smaller")}>A−</button>
          <span className="fsr__font-size">{fontSize}</span>
          <button className="fsr__chip" onClick={() => setFont(Math.min(24, fontSize + 1))} aria-label={t("readLater.bigger")}>A+</button>
          {["dark", "sepia", "light"].map((th) => (
            <button key={th} className={`fsr__chip fsr__chip--bg ${theme === th ? "active" : ""}`} onClick={() => setBg(th)} aria-label={th} />
          ))}
        </div>
        <button className="fsr__close" onClick={onBack} aria-label={t("common.close")}><CloseIcon size={15} strokeWidth={2} aria-hidden /></button>
      </div>

      <div className="fsr__body" ref={bodyRef}>
        {loading && <div className="fsr__center"><Loader /></div>}
        {!loading && error && (
          <div className="fsr__center">
            <p>{t("focus.saved.loadError")}</p>
            <button className="fsr__back" onClick={() => { setLoading(true); setError(null); fetchSavedContentFull({ contentId: item.contentId, contentType: item.contentType }).then((r) => { setLoading(false); if (r.ok) setContent(r.content); else setError(r.error); }); }}>
              {t("common.retry")}
            </button>
          </div>
        )}
        {!loading && content && (
          <article dir={dir} style={{ fontSize: `${fontSize}px` }}>
            <header>
              <span className={`fsr__type fsr__type--${TYPE_LABEL[item.contentType] || "post"}`}>
                {t(`focus.saved.filter.${TYPE_LABEL[item.contentType] || "post"}`)}
              </span>
              <h1>{content.title || t("focus.saved.untitled")}</h1>
              {content.descrip && <p className="fsr__descrip">{content.descrip}</p>}
              {content.userData?.F_user && (
                <div className="fsr__author">
                  {content.userData.imgProfile && <img src={content.userData.imgProfile} alt="" loading="lazy" />}
                  <span>{content.userData.F_user} {content.userData.S_user}</span>
                  {content.date && <span className="fsr__date">· {content.date}</span>}
                </div>
              )}
            </header>
            {Array.isArray(content.img) && content.img[0] && (
              <img className="fsr__cover" src={content.img[0]} alt="" loading="lazy" />
            )}
            <div className="fsr__content" dangerouslySetInnerHTML={{ __html: content.content || "" }} />

            <div className="fsr__complete">
              {item.readStatus === "completed" ? (
                <span className="fsr__done">✓ {t("readLater.completedBadge")}</span>
              ) : (
                <button className="fsr__back" onClick={markCompleted} disabled={marking}>
                  {t("readLater.markCompleted")}
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default FocusSavedReader;
