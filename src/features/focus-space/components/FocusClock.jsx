/**
 * FocusClock — renders the clock in one of 12 real themes.
 * Pure presentational component: theme kind → distinct markup.
 * Shared settings: color, size, seconds, date, 12/24h, Arabic numerals.
 *
 * Props contract (accepts both shapes for backwards compatibility):
 *  - <FocusClock settings={focusDoc} />      (used by FocusSpacePage)
 *  - <FocusClock themeId color size ... now /> (direct / tests)
 *
 * `now` may be a Date, epoch number, ISO string or undefined. It is always
 * normalized to a valid Date before any getHours()/getMinutes() call. When
 * no valid `now` is supplied the component owns a self-ticking clock that
 * updates once per second (Date is created inside the interval, never per
 * render).
 */
import React, { useEffect, useMemo, useState } from "react";
import { getClockTheme } from "../constants/clockThemes";
import { CLOCK_SIZE_MAX, CLOCK_SIZE_MIN } from "../constants/focusDefaults";
import FocusAnalogClock from "./FocusAnalogClock";
import "./focusClock.css";

const pad = (n) => String(n).padStart(2, "0");

/** True only for a real, valid Date instance. */
const isValidDate = (v) => v instanceof Date && !Number.isNaN(v.getTime());

/** Coerces any incoming value to a safe Date — never returns an invalid one. */
const toSafeDate = (value) => {
  if (isValidDate(value)) return value;
  if (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(); // last-resort fallback: the current time
};

/**
 * useNow — real ticking clock. Updates once per second via a single
 * interval; the Date instance is created inside the interval callback only,
 * so no fresh Date is allocated on every render. If the parent supplies a
 * valid Date we adopt it and stop our own ticker.
 */
const useNow = (external) => {
  const [now, setNow] = useState(() => new Date());
  const externalValid = isValidDate(external);
  useEffect(() => {
    if (externalValid) return undefined; // parent owns the clock
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [externalValid]);
  return externalValid ? external : now;
};

/** Formats parts in Arabic-Indic numerals when locale is Arabic. */
const digits = (n, arabic) =>
  arabic ? n.toLocaleString("ar-EG") : String(n);

const useParts = (nowRaw, { hour12, arabic, showSeconds }) => {
  return useMemo(() => {
    // Defensive: validate BEFORE calling any Date method.
    const now = toSafeDate(nowRaw);
    const rawHours = now.getHours();
    const suffix = rawHours < 12 ? "AM" : "PM";
    let h = rawHours;
    if (hour12) {
      h = h % 12 || 12;
    }
    const m = now.getMinutes();
    const s = now.getSeconds();
    return {
      hh: digits(hour12 ? h : pad(h), arabic),
      mm: digits(pad(m), arabic),
      ss: digits(pad(s), arabic),
      suffix,
      now, // the validated Date, reused by ring/bar/date rendering
    };
  }, [nowRaw, hour12, arabic, showSeconds]);
};

export const FocusClock = ({
  settings,
  themeId,
  color,
  size,
  hour12,
  arabic,
  showDate,
  showSeconds,
  now,
  immersive,
}) => {
  // Accept the whole focus-document as `settings` (FocusSpacePage shape) or
  // plain individual props. Explicit props win over settings fields.
  const s = settings && typeof settings === "object" ? settings : {};
  const tId = themeId ?? s.clockTheme;
  const cColor = color ?? s.clockColor ?? "#ffffff";
  // clockSize is a % of the clock area (30–90), not fixed px.
  const cSizePct = Math.min(CLOCK_SIZE_MAX, Math.max(CLOCK_SIZE_MIN, Number(s.clockSize) || 40));
  const cFont = s.clockFont || "Inter";
  const cFontWeight = s.clockFontWeight || "400";
  const cType = s.clockType === "analog" ? "analog" : "digital";
  const cHour12 = hour12 ?? s.use12Hour ?? false;
  const cArabic = arabic ?? s.clockArabicNumerals ?? false;
  const cShowDate = showDate ?? s.showDate ?? false;
  const cShowSeconds = showSeconds ?? s.showSeconds ?? true;
  const cImmersive = immersive ?? s.immersiveClock ?? false;

  // live ticking Date (shared by both digital and analog rendering)
  const safeNow = toSafeDate(useNow(isValidDate(now) ? now : s.now));
  const parts = useParts(safeNow, {
    hour12: cHour12,
    arabic: cArabic,
    showSeconds: cShowSeconds,
  });

  // ── ANALOG: a fully separate component, not a theme variant ──
  if (cType === "analog") {
    return (
      <div
        className={`fclk fclk--analog ${cImmersive ? "fclk--immersive" : ""}`}
        style={{ fontFamily: `"${cFont}", system-ui, sans-serif` }}
      >
        <FocusAnalogClock
          now={safeNow}
          color={cColor}
          sizePct={cSizePct}
          font={cFont}
          fontWeight={cFontWeight}
          hour12={cHour12}
          arabic={cArabic}
          showSeconds={cShowSeconds}
        />
        {cShowDate && (
          <div className="fclk__date">
            {safeNow.toLocaleDateString(cArabic ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        )}
      </div>
    );
  }

  const theme = getClockTheme(tId);
  const { hh, mm, ss, suffix } = parts;
  const style = {
    "--clock-color": cColor,
    // % of available area → responsive vmin font (30–90% user range)
    "--clock-size": `clamp(34px, ${(cSizePct / 100) * 18}vmin, ${(cSizePct / 100) * 0.32 * (typeof window !== "undefined" ? Math.min(window.innerWidth, window.innerHeight * 1.2) : 1280)}px)`,
    "--clock-font": `"${cFont}", system-ui, sans-serif`,
    "--clock-weight": cFontWeight,
    fontFamily: `var(--clock-font)`,
    fontWeight: cFontWeight,
  };
  const cls = `fclk fclk--${theme.kind} ${cImmersive ? "fclk--immersive" : ""}`;

  const timeNode = (() => {
    switch (theme.kind) {
      case "flip":
        return (
          <div className="fclk__flip">
            <span className="fclk__card">{hh}</span>
            <span className="fclk__colon">:</span>
            <span className="fclk__card">{mm}</span>
            {cShowSeconds && <><span className="fclk__colon">:</span><span className="fclk__card fclk__card--sec">{ss}</span></>}
          </div>
        );
      case "brick":
        return (
          <div className="fclk__brick">
            <div className="fclk__row"><span className="fclk__num">{hh}</span><span className="fclk__lbl">HH</span></div>
            <div className="fclk__row"><span className="fclk__num">{mm}</span><span className="fclk__lbl">MM</span></div>
            {cShowSeconds && <div className="fclk__row"><span className="fclk__num">{ss}</span><span className="fclk__lbl">SS</span></div>}
          </div>
        );
      case "outline":
        return (
          <div className="fclk__outline" dir="ltr">
            {hh}<span className="fclk__thin">:</span>{mm}
            {cShowSeconds && <><span className="fclk__thin">:</span><span className="fclk__sec">{ss}</span></>}
          </div>
        );
      case "serif":
        return (
          <div className="fclk__serif" dir="ltr">
            {hh}<span className="fclk__tick">·</span>{mm}
            {cShowSeconds && <><span className="fclk__tick">:</span><span className="fclk__sec">{ss}</span></>}
          </div>
        );
      case "dots":
        return (
          <div className="fclk__dots-wrap">
            <div className="fclk__time" dir="ltr">{hh}:{mm}{cShowSeconds ? `:${ss}` : ""}</div>
            <div className="fclk__dots" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <i key={i} className={i <= Math.floor(safeNow.getMinutes() * 0.2) ? "is-on" : ""} />
              ))}
            </div>
          </div>
        );
      case "mono":
        return (
          <div className="fclk__mono" dir="ltr">{hh}:{mm}{cShowSeconds ? `:${ss}` : ""}{cHour12 ? ` ${suffix}` : ""}</div>
        );
      case "ring": {
        // minute progress ring (SVG)
        const minuteFrac = (safeNow.getMinutes() * 60 + safeNow.getSeconds()) / 3600;
        const R = 46, C = 2 * Math.PI * R;
        return (
          <div className="fclk__ring-wrap">
            <svg viewBox="0 0 100 100" className="fclk__ring" aria-hidden>
              <circle cx="50" cy="50" r={R} className="fclk__ring-track" />
              <circle
                cx="50" cy="50" r={R}
                className="fclk__ring-prog"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - minuteFrac)}
              />
            </svg>
            <div className="fclk__ring-time" dir="ltr">{hh}:{mm}{cShowSeconds ? `:${ss}` : ""}</div>
          </div>
        );
      }
      case "bar":
        return (
          <div className="fclk__bar-wrap">
            <div className="fclk__time" dir="ltr">{hh}:{mm}{cShowSeconds ? `:${ss}` : ""}</div>
            <div className="fclk__bar" aria-hidden>
              <div className="fclk__bar-fill" style={{ width: `${(safeNow.getSeconds() / 60) * 100}%` }} />
            </div>
          </div>
        );
      case "glass":
        return (
          <div className="fclk__glass">
            <div className="fclk__time" dir="ltr">{hh}:{mm}{cShowSeconds ? `:${ss}` : ""}</div>
            {cHour12 && <span className="fclk__suffix">{suffix}</span>}
          </div>
        );
      default:
        return (
          <div className="fclk__time" dir="ltr">
            {hh}<span className="fclk__colon">:</span>{mm}
            {cShowSeconds && <><span className="fclk__colon">:</span><span className="fclk__sec">{ss}</span></>}
            {cHour12 && <span className="fclk__suffix">{suffix}</span>}
          </div>
        );
    }
  })();

  const dateStr = cShowDate
    ? safeNow.toLocaleDateString(cArabic ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <div className={cls} style={style} role="timer" aria-label="clock">
      {timeNode}
      {dateStr && <div className="fclk__date">{dateStr}</div>}
    </div>
  );
};

export default React.memo(FocusClock);
