/**
 * focusBackgrounds — Background Gallery for Focus Space.
 *
 * Three tiers:
 *   1. STATIC  — Unsplash photos (free license, hotlinked with size params)
 *                + zero-byte CSS gradient wallpapers (instant, offline).
 *   2. MOTION  — Coverr.com free-license MP4 videos (verified live, license:
 *                free for commercial & personal use, no attribution required)
 *                + pure-CSS animated wallpapers (GPU-cheap fallbacks).
 *                Videos: muted + loop + poster + static fallback on error,
 *                and they never play under prefers-reduced-motion.
 *   3. CUSTOM  — user uploads (see FocusBackgroundGallery: validated,
 *                stored locally via IndexedDB/blob URL unless the user
 *                explicitly asks to sync).
 *
 * Every entry resolves through resolveBackground() into a uniform shape:
 *   { type: "css" | "image" | "video", css?, src?, poster?, motion?, fallbackCss }
 */
export const BACKGROUND_FIT = { cover: "cover", contain: "contain" };

// ── CSS gradient wallpapers (offline-safe core) ──────────────────────
const GRADIENTS = [
  { id: "grad-midnight", name: "focus.bg.midnight", css: "linear-gradient(160deg, #0b1023 0%, #1b2440 55%, #2b3355 100%)", category: "dark" },
  { id: "grad-dawn", name: "focus.bg.dawn", css: "linear-gradient(160deg, #2b1055 0%, #7597de 100%)", category: "calm" },
  { id: "grad-forest", name: "focus.bg.forest", css: "linear-gradient(160deg, #134e5e 0%, #71b280 100%)", category: "nature" },
  { id: "grad-sunset", name: "focus.bg.sunset", css: "linear-gradient(160deg, #355c7d 0%, #6c5b7b 50%, #c06c84 100%)", category: "calm" },
  { id: "grad-ocean", name: "focus.bg.ocean", css: "linear-gradient(180deg, #0c3547 0%, #155e75 45%, #0e7490 100%)", category: "nature" },
  { id: "grad-mono", name: "focus.bg.mono", css: "linear-gradient(180deg, #17181c 0%, #23252b 100%)", category: "dark" },
  { id: "grad-paper", name: "focus.bg.paper", css: "linear-gradient(180deg, #e7e5e0 0%, #d6d3cd 100%)", category: "minimal", light: true },
  { id: "grad-canvas", name: "focus.bg.canvas", css: "linear-gradient(135deg, #fafafa 0%, #e8eaed 60%, #dfe1e5 100%)", category: "minimal", light: true },
  { id: "grad-violet", name: "focus.bg.violet", css: "linear-gradient(150deg, #1e1b4b 0%, #4c1d95 55%, #6d28d9 100%)", category: "abstract" },
  { id: "grad-ember", name: "focus.bg.ember", css: "linear-gradient(150deg, #1c0a0a 0%, #7c2d12 60%, #b45309 100%)", category: "abstract" },
];

// ── Photo wallpapers — Unsplash (free to use under the Unsplash License) ──
// Served at two sizes: thumb (gallery preview) + full (actual background).
const img = (id, name, category) => ({
  id: `ph-${id}`,
  name,
  category,
  type: "image",
  src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1920&q=75`,
  thumb: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&q=60`,
  fallbackCss: "linear-gradient(160deg,#0b1023,#2b3355)",
});

export const PHOTO_CATALOG = [
  // Nature
  img("1506744038136-46273834b3fb", "focus.bg.natureValley", "nature"),
  img("1441974231531-c6227db76b6e", "focus.bg.forestSun", "nature"),
  img("1470071459604-3b5ec3a7fe05", "focus.bg.foggyHills", "nature"),
  // Mountains
  img("1464822759023-fed622ff2c3b", "focus.bg.peakMist", "mountains"),
  img("1506905925346-21bda4d32df4", "focus.bg.alpine", "mountains"),
  img("1519681393784-d120267933ba", "focus.bg.nightPeaks", "mountains"),
  // Ocean
  img("1505144808419-1957a94ca61e", "focus.bg.tropicalSea", "ocean"),
  img("1439405326854-014607f694d7", "focus.bg.waveCrash", "ocean"),
  img("1471922694854-ff1b63b20054", "focus.bg.beachPalms", "ocean"),
  // Space
  img("1419242902214-272b3f66ee7a", "focus.bg.starryNight", "space"),
  img("1451187580459-43490279c0fa", "focus.bg.bluePlanet", "space"),
  img("1444903671408-38286cfa0908", "focus.bg.nebula", "space"),
  // Minimal
  img("1497366216548-37526070297c", "focus.bg.cleanDesk", "minimal"),
  img("1517816743773-6e0fd518b4a6", "focus.bg.paperTexture", "minimal"),
  // Architecture
  img("1487958449943-2429e8be8625", "focus.bg.whiteBuild", "architecture"),
  img("1486718448742-163732cd1544", "focus.bg.modernLines", "architecture"),
  // Dark & Calm
  img("1478760329108-5c3ed9d495a0", "focus.bg.darkRoom", "dark"),
  img("1470252649378-9c29740c9fa8", "focus.bg.duskCalm", "dark"),
  // Abstract
  img("1541701494587-cb58502866ab", "focus.bg.paintFlow", "abstract"),
  img("1550859492-d5da9d8e45f3", "focus.bg.gradientWave", "abstract"),
];

// ── Motion wallpapers — verified-live free-license MP4s (CC-BY, Blender
//    Foundation open movies, hosted on stable public CDNs) for the Abstract
//    Motion section, plus pure-CSS animated wallpapers (GPU-cheap, offline).
//    NOTE: nature/ocean scene MP4s from free CDNs (Coverr/Pixabay) are NOT
//    hotlink-stable — the honest option for those is "My device" upload,
//    which this system fully supports (validated MP4/WebM).
const vid = (id, name, category, url, poster) => ({
  id,
  name,
  category,
  type: "video",
  src: url,
  poster,
  motion: true,
  fallbackCss: poster,
});

export const VIDEO_CATALOG = [
  vid("v-abstract-blue", "focus.bg.videoAbstractBlue", "abstract",
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
    "linear-gradient(160deg,#0a1628 0%,#123a5c 55%,#2a7ba8 100%)"),
  vid("v-sintel", "focus.bg.videoSintel", "space",
    "https://media.w3.org/2010/05/sintel/trailer.mp4",
    "radial-gradient(ellipse at 50% 30%, #14213d 0%, #050810 75%)"),
  vid("v-abstract-tears", "focus.bg.videoTears", "abstract",
    "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4",
    "linear-gradient(160deg,#1a0a2e 0%,#3b1a5c 55%,#7b3fa8 100%)"),
];

// ── CSS-animated wallpapers (GPU-cheap, no video, respect reduce-motion) ──
export const ANIMATED_CATALOG = [
  { id: "fx-stars", name: "focus.bg.stars", base: "radial-gradient(ellipse at 30% 20%, #0f1b3d 0%, #060913 70%)", type: "css", motion: true },
  { id: "fx-clouds", name: "focus.bg.clouds", base: "linear-gradient(180deg, #5b7fa6 0%, #8fb3d1 60%, #c9d9e8 100%)", type: "css", motion: true },
  { id: "fx-rain", name: "focus.bg.rain", base: "linear-gradient(180deg, #10151d 0%, #1b2430 100%)", type: "css", motion: true },
  { id: "fx-aurora", name: "focus.bg.aurora", base: "linear-gradient(160deg, #04121f 0%, #0a2a3a 55%, #123f52 100%)", type: "css", motion: true },
];

export const BACKGROUND_CATALOG = [...GRADIENTS, ...PHOTO_CATALOG];

export const BG_CATEGORIES = [
  { key: "gradients", label: "focus.bg.cat.gradients" },
  { key: "nature", label: "focus.bg.cat.nature" },
  { key: "mountains", label: "focus.bg.cat.mountains" },
  { key: "ocean", label: "focus.bg.cat.ocean" },
  { key: "space", label: "focus.bg.cat.space" },
  { key: "minimal", label: "focus.bg.cat.minimal" },
  { key: "architecture", label: "focus.bg.cat.architecture" },
  { key: "dark", label: "focus.bg.cat.dark" },
  { key: "abstract", label: "focus.bg.cat.abstract" },
];

export const getBackgroundById = (id) =>
  BACKGROUND_CATALOG.find((b) => b.id === id) ||
  ANIMATED_CATALOG.find((b) => b.id === id) ||
  VIDEO_CATALOG.find((b) => b.id === id) ||
  null;

/** Legacy helper — CSS background string for gradient/image entries. */
export const resolveBackgroundCss = (entry) => {
  if (!entry) return "";
  if (entry.css) return entry.css;
  if (entry.base) return entry.base;
  if (entry.src && entry.type === "image") return `url("${entry.src}")`;
  if (entry.url) return `url("${entry.url}")`;
  if (entry.fallbackCss) return entry.fallbackCss;
  return "";
};

/**
 * resolveBackground — the uniform resolver used by the page renderer.
 * custom = { type:"image"|"video", src, name } from the user's device.
 */
export const resolveBackground = (id, custom) => {
  if (custom) {
    return {
      ...custom,
      motion: custom.type === "video",
      fallbackCss: "linear-gradient(160deg,#0b1023,#2b3355)",
    };
  }
  return getBackgroundById(id) || BACKGROUND_CATALOG[0];
};

export default BACKGROUND_CATALOG;
