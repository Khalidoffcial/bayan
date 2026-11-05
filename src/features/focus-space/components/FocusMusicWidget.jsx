/**
 * FocusMusicWidget — the Now-Playing widget floating over the Focus Space
 * background (iPhone-music inspired, glass effect, not a copy).
 *
 * Part of Focus Space ONLY: mounted by FocusSpacePage, never by the global
 * shell. Reads the ONE global audio engine (useAudio) — no second player.
 *
 * Mini   : cover + title/artist + play/pause + progress + expand, draggable.
 * Expanded: big cover + draggable seek + times + prev/next + volume + playlist.
 * Colors derive from the cover art (dominant hue) when available.
 * RTL/LTR aware; reduced-motion respects data.reduceMotion.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useSettings } from "../../../contexts/SettingsContext";
import { useAudio } from "../../audio/AudioContext";
import {
  PlayIcon, PauseIcon, SkipForwardIcon, SkipBackwardIcon,
  VolumeIcon, MuteIcon, ChevronDownIcon,
} from "../constants/focusIcons";
import "./focus-music-widget.css";

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

/** Extract a dominant hue from the cover — cheap: draw to a tiny canvas. */
const useDominantHue = (src) => {
  const [hue, setHue] = useState(null);
  useEffect(() => {
    if (!src) { setHue(null); return; }
    let dead = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    const onDone = () => {
      if (dead) return;
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        if (!n) return;
        r /= n; g /= n; b /= n;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        let h = 0;
        if (mx !== mn) {
          const d = mx - mn;
          if (mx === r) h = ((g - b) / d) % 6;
          else if (mx === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h *= 60; if (h < 0) h += 360;
        }
        setHue(Math.round(h));
      } catch { /* CORS canvas — ignore, fall back to neutral */ }
    };
    img.onload = onDone;
    img.onerror = () => setHue(null);
    return () => { dead = true; };
  }, [src]);
  return hue;
};

const PlaylistPane = ({ onPick }) => {
  const { t } = useTranslation();
  const { queue, currentTrack } = useAudio();
  if (!queue.length) return <p className="fmw-pl__empty">{t("focus.music.noQueue")}</p>;
  return (
    <ul className="fmw-pl">
      {queue.map((tr, i) => (
        <li key={`${tr.id}-${i}`}>
          <button
            className={`fmw-pl__row ${currentTrack?.id === tr.id ? "is-current" : ""}`}
            onClick={() => onPick(tr, i)}
          >
            {tr.thumbnail
              ? <img src={tr.thumbnail} alt="" className="fmw-pl__thumb" loading="lazy" />
              : <span className="fmw-pl__thumb fmw-pl__thumb--ph" />}
            <span className="fmw-pl__meta">
              <strong>{tr.title}</strong>
              <span>{tr.author || ""}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export const FocusMusicWidget = ({ reduceMotion, onHide }) => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const {
    currentTrack, isPlaying, isLoading, error,
    positionSec, duration, volume, muted,
    toggle, next, previous, seekTo, setVolume, toggleMute,
  } = useAudio();

  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ x: null, y: null }); // null = default corner
  const dragRef = useRef(null);

  const hue = useDominantHue(currentTrack?.thumbnail || null);
  const accent = hue != null ? `hsl(${hue} 70% 62%)` : "var(--fmw-accent, #7dd3fc)";

  // keep local progress in sync for a smooth bar
  // بعد الاستعادة من رحلة خارج Focus Space قد تتأخر metadata؛ نستخدم
  // مدة المسار المعروفة (durationSec) كبديل حتى يعبّئ العنصر duration.
  const effDuration = duration > 0 ? duration : (Number(currentTrack?.durationSec) || 0);
  const pct = effDuration > 0 ? Math.min(100, (positionSec / effDuration) * 100) : 0;

  // Drag (pointer events — works for mouse + touch)
  // إصلاح Pause: السحب كان يلتقط المؤشر (setPointerCapture) حتى عند الضغط
  // على الأزرار — فلا يصل click إلى زر Play/Pause أبدًا (Pointer Events
  // توجه كل الأحداث للعنصر الملتقط). نبدأ السحب فقط من غير الأزرار.
  const onPointerDown = (e) => {
    if (expanded) return; // expanded is centered — no drag
    if (e.target.closest("button, input")) return; // أزرار التحكم أولاً
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current._drag = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const el = dragRef.current;
    if (!el?._drag) return;
    const w = window.innerWidth, h = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const x = Math.min(w - rect.width - 8, Math.max(8, e.clientX - el._drag.dx));
    const y = Math.min(h - rect.height - 8, Math.max(8, e.clientY - el._drag.dy));
    setPos({ x, y });
  };
  const onPointerUp = () => { if (dragRef.current) dragRef.current._drag = null; };

  if (!currentTrack) return null; // nothing has ever played — widget hidden

  const miniStyle = pos.x != null
    ? { position: "fixed", left: pos.x, top: pos.y, "--fmw-accent": accent }
    : { "--fmw-accent": accent };

  const cover = currentTrack.thumbnail;

  return (
    <div
      ref={dragRef}
      className={`fmw ${expanded ? "fmw--expanded" : ""} ${isPlaying && !reduceMotion ? "fmw--playing" : ""} ${reduceMotion ? "fmw--reduce" : ""}`}
      dir={language === "ar" ? "rtl" : "ltr"}
      style={miniStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {!expanded ? (
        /* ── MINI ─────────────────────────────────────────────── */
        <div className="fmw-mini" role="region" aria-label={t("focus.music.widget")}>
          <button
            className="fmw-mini__cover"
            onClick={() => setExpanded(true)}
            aria-label={t("focus.music.expand")}
          >
            {cover
              ? <img src={cover} alt="" className="fmw-cover-img" />
              : <span className="fmw-cover-img fmw-cover-img--ph" />}
            {isPlaying && !reduceMotion && <span className="fmw-eq" aria-hidden><i /><i /><i /></span>}
          </button>

  <button className="fmw-mini__meta" onClick={() => setExpanded(true)}>
            <strong className="fmw-mini__title">{currentTrack.title}</strong>
            <span className="fmw-mini__sub">{currentTrack.author || currentTrack.reciter || ""}</span>
          </button>

          <button
            className="fmw-btn fmw-btn--play"
            onClick={toggle}
            disabled={isLoading}
            aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
          >
            {isLoading ? <span className="mini-spinner" /> : isPlaying
              ? <PauseIcon size={17} strokeWidth={2} aria-hidden />
              : <PlayIcon size={17} strokeWidth={2} aria-hidden />}
          </button>

          {/* Hide the widget — never touches the audio element: music keeps
              playing, position keeps advancing. Restore via the small fixed
              Music pill. Persisted per user via focus settings. */}
          <button
            className="fmw-mini__hide"
            onClick={(e) => { e.stopPropagation(); onHide?.(); }}
            aria-label={t("focus.music.hide")}
            title={t("focus.music.hide")}
          >
            <ChevronDownIcon size={14} strokeWidth={2} aria-hidden />
          </button>

          <div className="fmw-mini__bar" aria-hidden>
            <div className="fmw-mini__bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        /* ── EXPANDED ─────────────────────────────────────────── */
        <div className="fmw-exp" role="dialog" aria-label={t("focus.music.widget")}>
          <button className="fmw-exp__close" onClick={() => setExpanded(false)} aria-label={t("common.close")}>
            <ChevronDownIcon size={18} strokeWidth={2} aria-hidden />
          </button>

          <div className={`fmw-exp__art ${isPlaying && !reduceMotion ? "is-spinning" : ""}`}>
            {cover
              ? <img src={cover} alt="" className="fmw-cover-lg" />
              : <span className="fmw-cover-lg fmw-cover-lg--ph" />}
          </div>

          <div className="fmw-exp__head">
            <strong className="fmw-exp__title">{currentTrack.title}</strong>
            <span className="fmw-exp__sub">{currentTrack.author || currentTrack.reciter || currentTrack.album || ""}</span>
          </div>

          <div className="fmw-exp__seek">
            <input
              type="range" min="0" max={effDuration || 0} step="1"
              value={positionSec}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label={t("audio.seek")}
              disabled={!effDuration}
              style={{ "--fmw-accent": accent }}
            />
            <div className="fmw-exp__times">
              <span>{fmt(positionSec)}</span>
              <span>{fmt(effDuration)}</span>
            </div>
          </div>

          <div className="fmw-exp__controls">
            <button className="fmw-btn" onClick={previous} aria-label={t("audio.prev")}>
              <SkipBackwardIcon size={20} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              className="fmw-btn fmw-btn--play-lg"
              onClick={toggle}
              disabled={isLoading}
              aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
            >
              {isLoading ? <span className="mini-spinner" /> : isPlaying
                ? <PauseIcon size={26} strokeWidth={2} aria-hidden />
                : <PlayIcon size={26} strokeWidth={2} aria-hidden />}
            </button>
            <button className="fmw-btn" onClick={next} aria-label={t("audio.next")}>
              <SkipForwardIcon size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="fmw-exp__volume">
            <button className="fmw-btn" onClick={toggleMute} aria-label={t("focus.sounds.mute")} aria-pressed={muted}>
              {muted ? <MuteIcon size={15} strokeWidth={1.75} aria-hidden /> : <VolumeIcon size={15} strokeWidth={1.75} aria-hidden />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={t("focus.sounds.master")}
            />
          </div>

          {error && (
            <div className="fmw-exp__error" role="alert">
              {error === "NOT_SUPPORTED"
                ? t("audio.errorUnsupported")
                : error === "DECODE_FAILED"
                ? t("audio.errorDecode")
                : t("audio.errorRetry")}
            </div>
          )}

          <div className="fmw-exp__pl">
            <h4>{t("focus.music.queue")}</h4>
            <PlaylistPane onPick={(tr) => { if (currentTrack?.id === tr.id) toggle(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * MusicRevealButton — the ONLY way back to the widget after hiding it.
 * Fixed, small, inside Focus Space only (mounted by FocusSpacePage).
 * Shows the live play state (equalizer while playing) so the user can see
 * music is still running even with the widget hidden.
 * يستقبل onReveal من الصفحة نفسها — نسخة useFocusData مستقلة هنا لن تصلح:
 * كل useContext/useState منفصل لا يشارك الحالة مع instance الصفحة.
 */
export const MusicRevealButton = ({ onReveal }) => {
  const { t } = useTranslation();
  const { currentTrack, isPlaying } = useAudio();
  if (!currentTrack) return null; // nothing playing — no need to reveal
  return (
    <button
      className={`fmw-reveal ${isPlaying ? "is-playing" : ""}`}
      onClick={() => onReveal?.()}
      aria-label={t("focus.music.show")}
      title={t("focus.music.show")}
    >
      {isPlaying && <span className="fmw-eq fmw-eq--sm" aria-hidden><i /><i /><i /></span>}
      {t("focus.music.show")}
    </button>
  );
};

export default React.memo(FocusMusicWidget);
