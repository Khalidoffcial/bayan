/**
 * ShareSheet — the calm share experience.
 *
 * Flow: user taps Share → the sheet opens instantly → the image is generated
 * lazily in the background (never blocks the open) → user picks a size and
 * either: Native share (Web Share API with files, when available), Download,
 * or Copy Link. The sheet never claims success the browser didn't confirm.
 *
 * i18n: all labels through t(); direction follows the interface language.
 */
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X as CloseIcon, Download as DownloadIcon, Link2 as LinkIcon,
  Share2 as ShareIcon, Check as CheckIcon, Loader2 as SpinnerIcon,
} from "lucide-react";
import { generateShareImage, SHARE_SIZES } from "../services/shareImage";
import { useTranslation } from "../../../i18n/useTranslation";
import "./shareSheet.css";

const SIZE_KEYS = ["square", "portrait", "wide", "story"];

export const ShareSheet = ({ open, onClose, item }) => {
  const { t, dir } = useTranslation();
  const [size, setSize] = useState("square");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null); // { dataUrl, width, height }
  const [shareState, setShareState] = useState("idle"); // idle | done | failed | unsupported
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // Posts and replies live at /rp/:id; articles & novels at /r/:id.
  const kind = String(item?.kind || item?.type || "post").toLowerCase();
  const basePath = kind.startsWith("article") || kind.startsWith("novel") ? "/r/" : "/rp/";
  const contentUrl = item?.id ? `${origin}${basePath}${item.id}` : origin;

  // (Re)generate the image whenever the sheet opens or the size changes.
  useEffect(() => {
    if (!open || !item) return undefined;
    let alive = true;
    setGenerating(true);
    setPreview(null);
    setShareState("idle");
    (async () => {
      try {
        const result = await generateShareImage({
          content: item.content || item.descrip || "",
          title: item.title || "",
          authorName: item.userData?.F_user || "",
          authorAvatar: item.userData?.imgProfile || "",
          url: "bayan-space.vercel.app",
          size,
        });
        if (alive && result) setPreview(result);
      } finally {
        if (alive) setGenerating(false);
      }
    })();
    return () => { alive = false; };
  }, [open, item, size]);

  // Escape closes; body scroll locks while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const canNativeShareFiles =
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [new File([], "x.png", { type: "image/png" })] });

  const handleNativeShare = useCallback(async () => {
    if (!preview) return;
    const file = new File([preview.blob], "bayan-share.png", { type: "image/png" });
    if (!(navigator.canShare?.({ files: [file] }))) {
      setShareState("unsupported");
      return;
    }
    try {
      await navigator.share({
        files: [file],
        title: item?.title || "Bayan Space",
        text: (item?.content || item?.descrip || "").slice(0, 120),
      });
      setShareState("done"); // only after the browser resolves successfully
    } catch (err) {
      // AbortError = the user dismissed the native sheet — not a failure.
      if (err?.name !== "AbortError") setShareState("failed");
    }
  }, [preview, item]);

  const handleDownload = useCallback(() => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.dataUrl;
    a.download = `bayan-${item?.id || "share"}-${size}.png`;
    a.click();
  }, [preview, item, size]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [contentUrl]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="ssheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("share.title")}
          dir={dir}
        >
          <motion.div
            className="ssheet"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ssheet-head">
              <h2 className="ssheet-title">{t("share.title")}</h2>
              <button className="ssheet-close" onClick={onClose} aria-label={t("viewer.close")} type="button">
                <CloseIcon size={18} strokeWidth={2} />
              </button>
            </header>

            {/* Size selector — four quiet chips */}
            <div className="ssheet-sizes" role="radiogroup" aria-label={t("share.size")}>
              {SIZE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={size === key}
                  className={`ssheet-size ${size === key ? "is-active" : ""}`}
                  onClick={() => setSize(key)}
                >
                  <span className="ssheet-size-ratio">{SHARE_SIZES[key].label}</span>
                  <span className="ssheet-size-name">{t(`share.size.${key}`)}</span>
                </button>
              ))}
            </div>

            {/* Live preview — shows exactly what will be shared */}
            <div className="ssheet-preview">
              {generating && (
                <div className="ssheet-preview-loading">
                  <SpinnerIcon size={22} className="ssheet-spin" />
                  <span>{t("share.generating")}</span>
                </div>
              )}
              {!generating && preview && (
                <img className="ssheet-preview-img" src={preview.dataUrl} alt={t("share.previewAlt")} />
              )}
              {!generating && !preview && (
                <div className="ssheet-preview-failed">{t("share.generateFailed")}</div>
              )}
            </div>

            {/* Actions — one quiet row */}
            <div className="ssheet-actions">
              {canNativeShareFiles && (
                <button className="ssheet-btn ssheet-btn--primary" onClick={handleNativeShare} disabled={!preview}>
                  <ShareIcon size={17} strokeWidth={2} />
                  {t("share.send")}
                </button>
              )}
              <button className="ssheet-btn" onClick={handleDownload} disabled={!preview}>
                <DownloadIcon size={17} strokeWidth={2} />
                {t("share.download")}
              </button>
              <button className="ssheet-btn" onClick={handleCopyLink} disabled={!item?.id}>
                {copied ? <CheckIcon size={17} strokeWidth={2.4} /> : <LinkIcon size={17} strokeWidth={2} />}
                {copied ? t("share.copied") : t("share.copyLink")}
              </button>
            </div>

            {/* Honest status line — only what the browser actually confirmed */}
            {shareState === "done" && <p className="ssheet-status ssheet-status--ok">{t("share.sent")}</p>}
            {shareState === "failed" && <p className="ssheet-status ssheet-status--err">{t("share.failed")}</p>}
            {shareState === "unsupported" && <p className="ssheet-status">{t("share.useDownload")}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareSheet;
