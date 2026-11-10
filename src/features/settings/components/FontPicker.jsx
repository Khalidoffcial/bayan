/**
 * FontPicker — Settings → Appearance → Font Family.
 *
 * Premium compact selector for 27 families:
 *  - searchable (matches the English name AND the Arabic name)
 *  - grouped into Arabic / Latin / Multilingual categories
 *  - each row previews with REAL Arabic + English sample text rendered in
 *    that font (loaded lazily on first scroll into view — never all 27 at
 *    start; previews use only the 400 weight)
 *  - clear selected state + a "reset to default" row
 *  - direction-safe: rows flow RTL/LTR via the page's dir attribute
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, Search } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import { FONTS, FONT_CATEGORIES, DEFAULT_FONT } from "../../../constants/fonts";
import { loadFontFamily } from "../../../utils/loadFont";
import "./fontPicker.css";

const SAMPLE_AR = "مساحة للتركيز والتعلم والنمو.";
const SAMPLE_EN = "A Space to Focus. Connect. Grow.";

/** IntersectionObserver-based lazy loader: fetches a family only when its
 *  preview row is about to be visible. One observer per mount, owned and
 *  disconnected by the hook itself — never leaked to row lifecycles.
 *
 *  Bug history: this used to be recreated in a useMemo whenever `activeFont`
 *  changed while rows kept stale cleanup closures. During unmount React
 *  nulls `ref.current` BEFORE effect cleanup runs, so the stale cleanup
 *  called `io.unobserve(null)` → "parameter 1 is not of type 'Element'".
 *  The observer is now an instance-stable ref; rows capture the element in
 *  a local variable so cleanup always observes the exact element it added. */
const useLazyPreview = (activeFont) => {
  const rootRef = useRef(null);
  const observerRef = useRef(null);

  // Create the observer once per component mount (rows register themselves).
  // Selection changes re-render rows but must NOT swap the observer out from
  // under live cleanups.
  useEffect(() => {
    // Environments without IntersectionObserver (very old browsers, jsdom)
    // degrade to eager font loading instead of crashing.
    if (typeof IntersectionObserver !== "function") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const family = entry.target?.dataset?.fontFamily;
          if (family) loadFontFamily(family, { wait: false });
          if (entry.target instanceof Element) io.unobserve(entry.target);
        }
      },
      { root: rootRef.current, rootMargin: "120px" }
    );
    observerRef.current = io;
    return () => {
      observerRef.current = null;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return observerRef;
};

const FontRow = ({ font, selected, onSelect, observerRef }) => {
  const ref = useRef(null);

  React.useEffect(() => {
    const io = observerRef?.current;
    if (!io) return undefined;
    const el = ref.current;
    // Observe only a real Element; skip silently otherwise (rows may mount
    // before the observer exists on the very first commit).
    if (!io || !(el instanceof Element)) return undefined;
    io.observe(el);
    return () => {
      // `ref.current` may ALREADY be nulled by React before this cleanup
      // runs — using it here threw "parameter 1 is not of type 'Element'".
      // The captured `el` is always the exact element we observed.
      if (el instanceof Element) {
        try {
          io.unobserve(el);
        } catch {
          /* observer already disconnected — nothing to clean up */
        }
      }
    };
  }, [observerRef]);

  return (
    <button
      ref={ref}
      type="button"
      data-font-family={font.id}
      className={`font-option ${selected ? "font-option--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="font-option__text" style={{ fontFamily: `"${font.name}", sans-serif` }}>
        <span className="font-option__sample-ar" dir="rtl" lang="ar">{SAMPLE_AR}</span>
        <span className="font-option__sample-en" dir="ltr" lang="en">{SAMPLE_EN}</span>
      </span>
      <span className="font-option__meta">
        <span className="font-option__name">{font.name}</span>
        {selected && <Check size={16} strokeWidth={2.5} aria-hidden />}
      </span>
    </button>
  );
};

const FontPicker = ({ value, onChange, onReset }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const observerRef = useLazyPreview(value);
  const io = observerRef; // rows read observerRef.current

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FONTS.filter((f) => {
      if (category !== "all" && f.category !== category) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    return FONT_CATEGORIES.map((c) => ({
      ...c,
      fonts: filtered.filter((f) => f.category === c.id),
    })).filter((g) => g.fonts.length);
  }, [filtered]);

  const isDefault = value === DEFAULT_FONT;

  return (
    <div className="settings-card font-picker">
      <div className="card-title">{t("settings.fonts.title")}</div>

      <div className="font-picker__controls">
        <label className="font-picker__search">
          <Search size={15} strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("settings.fonts.search")}
            aria-label={t("settings.fonts.search")}
          />
        </label>

        <div className="font-picker__cats" role="tablist" aria-label={t("settings.fonts.title")}>
          {[{ id: "all", labelKey: "settings.fonts.cat.all" }, ...FONT_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={`font-picker__cat ${category === c.id ? "font-picker__cat--active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="font-picker__list" ref={(el) => { /* rows observe via the shared io */ }}>
        {grouped.map((group) => (
          <div key={group.id} className="font-picker__group">
            <div className="font-picker__group-label">{t(group.labelKey)}</div>
            {group.fonts.map((f) => (
              <FontRow
                key={f.id}
                font={f}
                selected={value === f.id}
                observerRef={io}
                onSelect={() => onChange(f.id)}
              />
            ))}
          </div>
        ))}
        {!grouped.length && (
          <div className="font-picker__empty">{t("settings.fonts.empty")}</div>
        )}
      </div>

      <button
        type="button"
        className={`font-picker__reset ${isDefault ? "font-picker__reset--disabled" : ""}`}
        onClick={isDefault ? undefined : onReset}
        disabled={isDefault}
      >
        <RotateCcw size={14} strokeWidth={2} aria-hidden />
        {t("settings.fonts.reset")}
      </button>
    </div>
  );
};

export default React.memo(FontPicker);
