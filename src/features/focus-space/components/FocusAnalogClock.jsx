/**
 * FocusAnalogClock — REAL analog clock (SVG hands, not a skin).
 * Rendered when settings.clockType === "analog".
 *
 * - hour/minute/second hands computed from the live Date every second
 * - ticks + optional numerals (12/3/6/9 or Arabic-Indic)
 * - inherits the clock font (digits + labels) and clock color/size
 * - `size` arrives as a % of the clock area; converted to vmin clamp
 */
import React, { useMemo } from "react";
import { useTranslation } from "../../../i18n/useTranslation";

const pad = (n) => String(n).padStart(2, "0");

export const FocusAnalogClock = ({ now, color = "#ffffff", sizePct = 40, font, fontWeight, hour12, arabic, showSeconds }) => {
  const { t } = useTranslation();
  // CSS size: percent of the available clock area → vmin clamp (never overflow)
  const css = `clamp(120px, ${(sizePct / 100) * 60}vmin, ${(sizePct / 100) * 0.9 * Math.min(
    typeof window !== "undefined" ? window.innerWidth : 1280,
    typeof window !== "undefined" ? window.innerHeight : 800
  )}px)`;

  const { hourAngle, minAngle, secAngle, hh, mm, suffix } = useMemo(() => {
    const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const h24 = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    return {
      hourAngle: ((h24 % 12) + m / 60) * 30,       // 30°/hour
      minAngle: (m + s / 60) * 6,                  // 6°/minute
      secAngle: (s + (d.getMilliseconds?.() || 0) / 1000) * 6,
      hh: hour12 ? String(h24 % 12 || 12).padStart(2, "0") : pad(h24),
      mm: pad(m),
      suffix: h24 < 12 ? "AM" : "PM",
    };
  }, [now, hour12]);

  const numerals = arabic
    ? ["١٢", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١١"]
    : ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

  const style = {
    width: css,
    height: css,
    "--analog-color": color,
    "--analog-font": font || "inherit",
    "--analog-weight": fontWeight || "400",
  };

  return (
    <div className="fclock-analog" style={style} role="timer" aria-label={t("aria.analogClock")} dir="ltr">
      <svg viewBox="0 0 100 100" className="fclock-analog__svg">
        {/* face */}
        <circle cx="50" cy="50" r="48" className="fclock-analog__face" />
        {/* ticks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          const a = (i * 6 - 90) * (Math.PI / 180);
          const r1 = major ? 38 : 42;
          const r2 = 45;
          return (
            <line
              key={i}
              x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
              x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
              className={`fclock-analog__tick ${major ? "fclock-analog__tick--major" : ""}`}
            />
          );
        })}
        {/* numerals at 12/3/6/9 only (keeps the face clean) */}
        {numerals.map((label, i) => {
          if (i % 3 !== 0) return null;
          const a = (i * 30 - 90) * (Math.PI / 180);
          const r = 30;
          return (
            <text
              key={i}
              x={50 + r * Math.cos(a)} y={50 + r * Math.sin(a)}
              className="fclock-analog__numeral"
              dominantBaseline="central"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
        {/* hands */}
        <g transform={`rotate(${hourAngle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="28" className="fclock-analog__hand fclock-analog__hand--hour" />
        </g>
        <g transform={`rotate(${minAngle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="18" className="fclock-analog__hand fclock-analog__hand--minute" />
        </g>
        {showSeconds && (
          <g transform={`rotate(${secAngle} 50 50)`}>
            <line x1="50" y1="54" x2="50" y2="16" className="fclock-analog__hand fclock-analog__hand--second" />
          </g>
        )}
        <circle cx="50" cy="50" r="2.4" className="fclock-analog__pin" />
      </svg>
      <div className="fclock-analog__digital" aria-hidden>
        {hh}:{mm}{hour12 ? <span className="fclock-analog__suffix"> {suffix}</span> : null}
      </div>
    </div>
  );
};

export default React.memo(FocusAnalogClock);
