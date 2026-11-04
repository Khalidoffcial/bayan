/**
 * focusBackgrounds — Background Gallery for Focus Space.
 *
 * Built-in gradients are zero-byte CSS wallpapers (instant, offline).
 * User-uploaded images go through the settings panel (object URLs held
 * per session; persisted as data URLs only if the user confirms — keep
 * size small; see FocusSettingsPanel).
 *
 * fx entries are pure-CSS ANIMATED wallpapers (clouds drift, rain streaks,
 * stars twinkle, light sweep) — no video, GPU-cheap, and each carries
 * `motion: true` so they respect reduce-motion.
 */
export const BACKGROUND_FIT = { cover: "cover", contain: "contain" };

export const BACKGROUND_CATALOG = [
  {
    id: "grad-midnight",
    name: "focus.bg.midnight",
    css: "linear-gradient(160deg, #0b1023 0%, #1b2440 55%, #2b3355 100%)",
    category: "dark",
  },
  {
    id: "grad-dawn",
    name: "focus.bg.dawn",
    css: "linear-gradient(160deg, #2b1055 0%, #7597de 100%)",
    category: "calm",
  },
  {
    id: "grad-forest",
    name: "focus.bg.forest",
    css: "linear-gradient(160deg, #134e5e 0%, #71b280 100%)",
    category: "nature",
  },
  {
    id: "grad-sunset",
    name: "focus.bg.sunset",
    css: "linear-gradient(160deg, #355c7d 0%, #6c5b7b 50%, #c06c84 100%)",
    category: "calm",
  },
  {
    id: "grad-ocean",
    name: "focus.bg.ocean",
    css: "linear-gradient(180deg, #0c3547 0%, #155e75 45%, #0e7490 100%)",
    category: "nature",
  },
  {
    id: "grad-mono",
    name: "focus.bg.mono",
    css: "linear-gradient(180deg, #17181c 0%, #23252b 100%)",
    category: "dark",
  },
  {
    id: "grad-paper",
    name: "focus.bg.paper",
    css: "linear-gradient(180deg, #e7e5e0 0%, #d6d3cd 100%)",
    category: "minimal",
    light: true, // bright wallpaper — overlay stays readable
  },
  {
    id: "grad-canvas",
    name: "focus.bg.canvas",
    css: "linear-gradient(135deg, #fafafa 0%, #e8eaed 60%, #dfe1e5 100%)",
    category: "minimal",
    light: true,
  },
  {
    id: "grad-violet",
    name: "focus.bg.violet",
    css: "linear-gradient(150deg, #1e1b4b 0%, #4c1d95 55%, #6d28d9 100%)",
    category: "abstract",
  },
  {
    id: "grad-ember",
    name: "focus.bg.ember",
    css: "linear-gradient(150deg, #1c0a0a 0%, #7c2d12 60%, #b45309 100%)",
    category: "abstract",
  },
];

/** CSS-animated wallpapers (motion off / reduce-motion → static gradient). */
export const ANIMATED_CATALOG = [
  {
    id: "fx-stars",
    name: "focus.bg.stars",
    base: "radial-gradient(ellipse at 30% 20%, #0f1b3d 0%, #060913 70%)",
    motion: true,
  },
  {
    id: "fx-clouds",
    name: "focus.bg.clouds",
    base: "linear-gradient(180deg, #5b7fa6 0%, #8fb3d1 60%, #c9d9e8 100%)",
    motion: true,
  },
  {
    id: "fx-rain",
    name: "focus.bg.rain",
    base: "linear-gradient(180deg, #10151d 0%, #1b2430 100%)",
    motion: true,
  },
  {
    id: "fx-aurora",
    name: "focus.bg.aurora",
    base: "linear-gradient(160deg, #04121f 0%, #0a2a3a 55%, #123f52 100%)",
    motion: true,
  },
];

export const getBackgroundById = (id) =>
  BACKGROUND_CATALOG.find((b) => b.id === id) ||
  ANIMATED_CATALOG.find((b) => b.id === id) ||
  null;

/** Resolves any background entry into a CSS background value. */
export const resolveBackgroundCss = (entry) => {
  if (!entry) return "";
  if (entry.css) return entry.css;
  if (entry.base) return entry.base;
  if (entry.url) return `url("${entry.url}")`;
  if (entry.src) return `url("${entry.src}")`;
  return "";
};

export default BACKGROUND_CATALOG;
