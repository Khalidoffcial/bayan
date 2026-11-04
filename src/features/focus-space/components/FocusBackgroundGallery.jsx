/**
 * FocusBackgroundGallery — real background picker for Focus Space.
 *
 * Tabs: Photos (Unsplash, categorized) · Motion (Coverr videos + CSS fx)
 *       · My device (validated upload; stored in IndexedDB locally —
 *       the user explicitly opts into anything beyond the local device).
 *
 * Upload validation: MIME sniffing of the real magic bytes (not just the
 * extension), size caps (image 8MB / video 40MB), and real media dimension
 * checks (image decode / video metadata). Clear error messages per failure.
 */
import {
  useCallback, useEffect, useRef, useState,
} from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useSettings } from "../../../contexts/SettingsContext";
import {
  BACKGROUND_CATALOG, ANIMATED_CATALOG, VIDEO_CATALOG, BG_CATEGORIES,
} from "../constants/focusBackgrounds";
import {
  DeleteIcon, UploadIcon, ImageIcon, NatureIcon, CheckIcon,
} from "../constants/focusIcons";
import "../styles/focus-space.css";

/** Magic-byte sniffing constants live inline in sniffMime(). */
const IMG_EXT_OK = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT_OK = /\.(mp4|webm)$/i;
const MAX_IMG = 8 * 1024 * 1024;
const MAX_VID = 40 * 1024 * 1024;

/** Read the first bytes and match against known magic numbers. */
const sniffMime = async (file) => {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = [...head].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  if (hex.startsWith("FFD8FF")) return "image/jpeg";
  if (hex.startsWith("89504E47")) return "image/png";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  if (hex.slice(4, 12) === "66747970" && hex.slice(8, 12) !== "0000") {
    // ftyp box → mp4/mov family; accept isom/mp42/mp41/avc1/mp4v
    const brand = hex.slice(8, 16);
    if (/^(69736F6D|69736F32|6D703432|6D703431|61766331|6D706935)/.test(brand)) return "video/mp4";
  }
  if (hex.startsWith("1A45DFA3")) return "video/webm";
  return null;
};

const probeImage = (src) => new Promise((resolve) => {
  const im = new Image();
  im.onload = () => resolve({ ok: im.naturalWidth >= 320, w: im.naturalWidth, h: im.naturalHeight });
  im.onerror = () => resolve({ ok: false });
  im.src = src;
});

const probeVideo = (src) => new Promise((resolve) => {
  const v = document.createElement("video");
  v.preload = "metadata";
  v.onloadedmetadata = () => resolve({ ok: v.videoWidth >= 480, w: v.videoWidth, h: v.videoHeight, duration: v.duration });
  v.onerror = () => resolve({ ok: false });
  setTimeout(() => resolve({ ok: false }), 6000);
  v.src = src;
});

// ── tiny IndexedDB helper (single store, best-effort) ─────────────────
const DB_NAME = "bayanFocusBg";
const openDb = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains("bg")) req.result.createObjectStore("bg");
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const idbSet = async (key, blob) => {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction("bg", "readwrite");
      tx.objectStore("bg").put(blob, key);
      tx.oncomplete = res; tx.onerror = rej;
    });
    return true;
  } catch { return false; }
};
const idbGet = async (key) => {
  try {
    const db = await openDb();
    return await new Promise((res) => {
      const tx = db.transaction("bg", "readonly");
      const r = tx.objectStore("bg").get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch { return null; }
};
const idbDel = async (key) => {
  try {
    const db = await openDb();
    await new Promise((res) => {
      const tx = db.transaction("bg", "readwrite");
      tx.objectStore("bg").delete(key);
      tx.oncomplete = res; tx.onerror = res;
    });
  } catch { /* ignore */ }
};

/**
 * ensureCustomLoaded — resolves a fresh blob URL for the stored custom
 * background. Called by FocusSpacePage when background === "custom".
 * Cached module-level so repeated mounts don't churn object URLs.
 */
let customUrlCache = null;
export const ensureCustomLoaded = async () => {
  if (customUrlCache) return customUrlCache;
  const blob = await idbGet("customBg");
  if (!blob) return null;
  customUrlCache = URL.createObjectURL(blob);
  return customUrlCache;
};

export const FocusBackgroundGallery = ({ data, update }) => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const [tab, setTab] = useState("photos"); // photos | motion | mine
  const [cat, setCat] = useState("all");
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customPreview, setCustomPreview] = useState(null);
  const [syncPref, setSyncPref] = useState("local"); // local | sync
  const fileRef = useRef(null);
  const customUrlRef = useRef(null);

  // restore the locally-stored custom background on mount
  useEffect(() => {
    let dead = false;
    (async () => {
      const blob = await idbGet("customBg");
      if (dead || !blob) return;
      const isVideo = blob.type.startsWith("video/");
      const url = URL.createObjectURL(blob);
      customUrlRef.current = url;
      
      if (data.background === "custom") update({ customBgType: isVideo ? "video" : "image" });
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id) => update({ background: id, customBgType: null });

  const currentId = data.background;

  const handleFile = useCallback(async (file) => {
    setUploadError(null);
    if (!file) return;
    setUploading(true);
    try {
      // 1. real MIME by magic bytes
      const mime = await sniffMime(file);
      const isImage = mime && mime.startsWith("image/");
      const isVideo = mime === "video/mp4" || mime === "video/webm";
      if (!isImage && !isVideo) {
        // extension-aware error message
        const extOk = IMG_EXT_OK.test(file.name) || VIDEO_EXT_OK.test(file.name);
        setUploadError(extOk ? t("focus.bgUpload.corrupt") : t("focus.bgUpload.unsupported"));
        return;
      }
      // 2. size cap
      if (isImage && file.size > MAX_IMG) { setUploadError(t("focus.bgUpload.tooLargeImage")); return; }
      if (isVideo && file.size > MAX_VID) { setUploadError(t("focus.bgUpload.tooLargeVideo")); return; }
      // 3. real media probe
      const url = URL.createObjectURL(file);
      const probe = isImage ? await probeImage(url) : await probeVideo(url);
      if (!probe.ok) {
        URL.revokeObjectURL(url);
        setUploadError(t("focus.bgUpload.badMedia"));
        return;
      }
      // 4. store locally (IndexedDB) — explicit user consent scope
      const stored = await idbSet("customBg", file);
      if (!stored) { setUploadError(t("focus.bgUpload.storageFail")); URL.revokeObjectURL(url); return; }
      if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
      customUrlRef.current = url;
      const type = isImage ? "image" : "video";
      
      setCustomPreview({ type, src: url, name: file.name, w: probe.w, h: probe.h });
      update({ background: "custom", customBgType: type });
    } finally {
      setUploading(false);
    }
  }, [t, update]);

  const removeCustom = async () => {
    await idbDel("customBg");
    if (customUrlRef.current) { URL.revokeObjectURL(customUrlRef.current); customUrlRef.current = null; }
    
    setCustomPreview(null);
    update({ background: "grad-midnight", customBgType: null });
  };

  const photoCats = BG_CATEGORIES.filter((c) => c.key !== "gradients");

  const filtered = cat === "all" ? BACKGROUND_CATALOG : BACKGROUND_CATALOG.filter((b) => b.category === cat);

  return (
    <div className="fc-bgg" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="fc-bgg__tabs" role="tablist">
        <button role="tab" aria-selected={tab === "photos"} className={`fc-bgg__tab ${tab === "photos" ? "active" : ""}`} onClick={() => setTab("photos")}>
          <ImageIcon size={14} strokeWidth={1.75} aria-hidden /> {t("focus.bg.tabs.photos")}
        </button>
        <button role="tab" aria-selected={tab === "motion"} className={`fc-bgg__tab ${tab === "motion" ? "active" : ""}`} onClick={() => setTab("motion")}>
          <NatureIcon size={14} strokeWidth={1.75} aria-hidden /> {t("focus.bg.tabs.motion")}
        </button>
        <button role="tab" aria-selected={tab === "mine"} className={`fc-bgg__tab ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>
          <UploadIcon size={14} strokeWidth={1.75} aria-hidden /> {t("focus.bg.tabs.mine")}
        </button>
      </div>

      {/* ── PHOTOS ── */}
      {tab === "photos" && (
        <>
          <div className="fc-bgg__cats">
            <button className={`fc-chip ${cat === "all" ? "active" : ""}`} onClick={() => setCat("all")}>{t("focus.bg.cat.all")}</button>
            {photoCats.map((c) => (
              <button key={c.key} className={`fc-chip ${cat === c.key ? "active" : ""}`} onClick={() => setCat(c.key)}>{t(c.label)}</button>
            ))}
          </div>
          <div className="fc-bgg__grid">
            {filtered.map((b) => (
              <button
                key={b.id}
                className={`fc-bgg__cell ${currentId === b.id ? "is-current" : ""}`}
                onClick={() => pick(b.id)}
                aria-pressed={currentId === b.id}
              >
                {b.type === "image" && b.thumb
                  ? <img src={b.thumb} alt={t(b.name)} loading="lazy" />
                  : <span className="fc-bgg__swatch" style={{ background: b.css }} />}
                <span className="fc-bgg__name">{t(b.name)}</span>
                {currentId === b.id && <span className="fc-bgg__check"><CheckIcon size={14} strokeWidth={2.5} aria-hidden /></span>}
              </button>
            ))}
            {/* gradients appended for one-tap access */}
            {cat === "all" && ANIMATED_CATALOG.filter((b) => b.type === "css").map((b) => (
              <button key={b.id} className={`fc-bgg__cell ${currentId === b.id ? "is-current" : ""}`} onClick={() => pick(b.id)}>
                <span className="fc-bgg__swatch" style={{ background: b.base }} />
                <span className="fc-bgg__name">{t(b.name)}</span>
              </button>
            ))}
          </div>
          <p className="fc-bgg__note">{t("focus.bg.photosNote")}</p>
        </>
      )}

      {/* ── MOTION ── */}
      {tab === "motion" && (
        <>
          <div className="fc-bgg__grid">
            {VIDEO_CATALOG.map((b) => (
              <button key={b.id} className={`fc-bgg__cell fc-bgg__cell--video ${currentId === b.id ? "is-current" : ""}`} onClick={() => pick(b.id)}>
                <span className="fc-bgg__swatch" style={{ background: b.fallbackCss }} />
                <span className="fc-bgg__playbadge">▶</span>
                <span className="fc-bgg__name">{t(b.name)}</span>
                {currentId === b.id && <span className="fc-bgg__check"><CheckIcon size={14} strokeWidth={2.5} aria-hidden /></span>}
              </button>
            ))}
          </div>
          <div className="fc-bgg__row">
            <ToggleRow
              label={t("focus.bg.motionToggle")}
              checked={data.backgroundAnim !== false}
              onChange={() => update({ backgroundAnim: data.backgroundAnim === false })}
            />
          </div>
          <p className="fc-bgg__note">{t("focus.bg.motionNote")}</p>
        </>
      )}

      {/* ── MY DEVICE ── */}
      {tab === "mine" && (
        <div className="fc-bgg__mine">
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
          />
          <button className="fc-btn fc-btn--primary fc-bgg__upload" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <UploadIcon size={15} strokeWidth={1.75} aria-hidden />
            {uploading ? t("focus.bgUpload.checking") : t("focus.bgUpload.button")}
          </button>

          {uploadError && <div className="fc-bgg__error" role="alert">{uploadError}</div>}

          {customPreview && (
            <div className="fc-bgg__preview">
              {customPreview.type === "image"
                ? <img src={customPreview.src} alt="" />
                : <video src={customPreview.src} muted playsInline />}
              <div className="fc-bgg__preview-meta">
                <span>{customPreview.w}×{customPreview.h}</span>
                <span>{customPreview.type === "video" ? "MP4/WebM" : "JPG/PNG/WebP"}</span>
              </div>
              <button className="fc-btn fc-btn--danger" onClick={removeCustom}><DeleteIcon size={13} strokeWidth={2} aria-hidden /> {t("focus.bgUpload.remove")}</button>
            </div>
          )}

          <div className="fc-bgg__row">
            <label className="fc-setting-row">
              <span>{t("focus.bgUpload.storage")}</span>
              <select className="fc-select" value={syncPref} onChange={(e) => setSyncPref(e.target.value)}>
                <option value="local">{t("focus.bgUpload.stayLocal")}</option>
                <option value="sync" disabled>{t("focus.bgUpload.syncSoon")}</option>
              </select>
            </label>
          </div>
          <p className="fc-bgg__note">{t("focus.bgUpload.note")}</p>
        </div>
      )}
    </div>
  );
};

const ToggleRow = ({ label, checked, onChange }) => (
  <label className="fc-setting-row">
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={onChange} />
  </label>
);

export default FocusBackgroundGallery;

