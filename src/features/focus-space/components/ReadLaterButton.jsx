/**
 * ReadLaterButton — "اقرأها لاحقًا" bookmark button next to Share on
 * articles / novels / posts.
 *
 * - Uses the EXISTING per-user savedContent store (no duplicate system).
 * - Toggle: first click saves (confirmed by the server), second click removes.
 * - Saved state is checked on mount from the server (cached in-memory).
 * - Never shows fake success: the button only turns "saved" after the
 *   server answers ok. On auth failure the existing save policy applies
 *   (button stays unsaved, error toast, no lost content).
 * - Small, RTL/LTR aware, tooltip via title + aria-label.
 */
import React, { useEffect, useState } from "react";
import { Bookmark as FaRegBookmark, BookmarkCheck as FaBookmark } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../components/ui/Toast";
import { useTranslation } from "../../../i18n/useTranslation";
import { toggleReadLater, getSavedStatus } from "../services/savedContent.service";
import "./readLater.css";

export const ReadLaterButton = ({ contentId, contentType, title, image, compact = false, className = "" }) => {
  const { user } = useAuth();
  const toast = useToast();
  const { t, language } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // resolved type: articles / novels / posts (record shapes vary)
  const type = String(contentType || "").toLowerCase();

  useEffect(() => {
    let dead = false;
    if (!user?.id || !contentId) return;
    getSavedStatus({ contentId, contentType: type }).then((r) => {
      if (!dead && r.ok) setSaved(Boolean(r.saved));
    });
    return () => { dead = true; };
  }, [user?.id, contentId, type]);

  const handleClick = async (e) => {
    e.stopPropagation(); // never trigger the card/reader's own click
    if (!user?.id) {
      toast.info(t("readLater.loginRequired"));
      return;
    }
    if (busy || !contentId) return;
    setBusy(true);
    const result = await toggleReadLater({ contentId, contentType: type, title, image });
    setBusy(false);
    if (!result.ok) {
      toast.error(t("readLater.failed"));
      return;
    }
    setSaved(result.saved);
    toast.success(result.saved ? t("readLater.saved") : t("readLater.removed"));
  };

  const label = saved ? t("readLater.savedLabel") : t("readLater.label");

  return (
    <button
      type="button"
      className={`read-later-btn ${saved ? "is-saved" : ""} ${compact ? "is-compact" : ""} ${className}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
      aria-pressed={saved}
      disabled={busy}
    >
      {saved ? <FaBookmark aria-hidden /> : <FaRegBookmark aria-hidden />}
      <span className="read-later-btn__text">{label}</span>
    </button>
  );
};

export default React.memo(ReadLaterButton);
