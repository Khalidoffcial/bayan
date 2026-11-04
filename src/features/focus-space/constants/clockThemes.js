/**
 * clockThemes — the unified Theme Engine for Focus Space time tools.
 *
 * One registry drives the Clock, Timer, Stopwatch and Pomodoro so the
 * whole space shares one visual identity. Each theme is a REAL design
 * variant (layout + rendering style), not just a color swap:
 *
 *  digital   — big tabular digits (Apple Minimal)
 *  clean     — digits without separators glow, tighter tracking
 *  flip      — split cards that "flip" on the minute (CSS animation)
 *  serif     — elegant thin serif numerals with hairline separators
 *  glass     — frosted card behind the digits
 *  neon      — glow-stroked digits (blue neon)
 *  outline   — huge hollow numerals (typographic poster)
 *  mono      — monospace terminal style
 *  ring      — SVG progress ring wrapping digital time
 *  bar       — thin progress bar under the digits
 *  dots      — minute dots around a minimal face
 *  brick     — stacked HH / MM / SS rows with labels
 *
 * Every theme supports color/size/seconds/date/12h and Arabic + RTL
 * (digits use locale numerals via toLocaleTimeString).
 */

export const CLOCK_THEMES = [
  { id: "apple", label: "focus.theme.apple", kind: "digital", defaultColor: "#ffffff" },
  { id: "clean", label: "focus.theme.clean", kind: "digital", defaultColor: "#e5e7eb" },
  { id: "flip", label: "focus.theme.flip", kind: "flip", defaultColor: "#ffffff" },
  { id: "serif", label: "focus.theme.serif", kind: "serif", defaultColor: "#f5f0e6" },
  { id: "glass", label: "focus.theme.glass", kind: "glass", defaultColor: "#ffffff" },
  { id: "neon", label: "focus.theme.neon", kind: "neon", defaultColor: "#38bdf8" },
  { id: "outline", label: "focus.theme.outline", kind: "outline", defaultColor: "#ffffff" },
  { id: "mono", label: "focus.theme.mono", kind: "mono", defaultColor: "#a3e635" },
  { id: "ring", label: "focus.theme.ring", kind: "ring", defaultColor: "#0f8ee2" },
  { id: "bar", label: "focus.theme.bar", kind: "bar", defaultColor: "#ffffff" },
  { id: "dots", label: "focus.theme.dots", kind: "dots", defaultColor: "#ffffff" },
  { id: "brick", label: "focus.theme.brick", kind: "brick", defaultColor: "#ffffff" },
];

export const CLOCK_THEME_IDS = CLOCK_THEMES.map((t) => t.id);

export const getClockTheme = (id) =>
  CLOCK_THEMES.find((t) => t.id === id) || CLOCK_THEMES[0];

/**
 * Tool themes — each time tool picks from the same engine (subset makes
 * sense per tool, but any theme may be applied). Independent per tool +
 * an "unified" option that follows the clock theme.
 */
export const TOOL_THEMES = CLOCK_THEMES;

export default CLOCK_THEMES;
