/**
 * missingAssets — single source of truth for the LOCAL files Focus Space
 * is waiting for. Nothing invented, no placeholder URLs: entries with
 * `provided: false` are disabled in the UI with a clear "needs file" state.
 *
 * Once you drop a file at the listed path, flip `provided` to true (or the
 * resolver below auto-detects dev-mode files in /public/audio/focus).
 */

export const LOCAL_AUDIO_DIR = "/audio/focus";

/**
 * Ambient sound slots that need local files.
 * Loopable, seam-free ambient tracks, 1–5 min, MP3 (CBR recommended).
 */
export const MISSING_AUDIO_FILES = [
  { id: "rain", file: "rain.mp3", label: "Rain loop (soft, no thunderclaps)" },
  { id: "thunder", file: "thunder.mp3", label: "Distant thunder loop" },
  { id: "forest", file: "forest.mp3", label: "Forest ambience loop" },
  { id: "birds", file: "birds.mp3", label: "Morning birds loop" },
  { id: "waves", file: "waves.mp3", label: "Ocean waves loop" },
  { id: "fireplace", file: "fireplace.mp3", label: "Fireplace crackle loop" },
  { id: "wind", file: "wind.mp3", label: "Soft wind loop" },
  { id: "cafe", file: "cafe.mp3", label: "Café murmur loop" },
];

/** Resolves /public/audio/focus/<file> — files there need no bundling. */
const resolveLocal = (file) => `${LOCAL_AUDIO_DIR}/${file}`;

export const LOCAL_SOUND_SRC = MISSING_AUDIO_FILES.reduce((acc, { id, file }) => {
  acc[id] = resolveLocal(file);
  return acc;
}, {});

/**
 * Missing ICONS — elements Focus Space needs but the icons folder does
 * not currently contain. Do NOT substitute random assets for these.
 * Format: inline SVG, 24×24 viewBox, stroke/fill = currentColor, 2px stroke.
 * Path:  bayan/src/assets/icons/<name>.svg
 */
export const MISSING_ICONS = [
  { name: "timer.svg", usedFor: "Timer tab in clock panel", size: "24px", format: "SVG (currentColor)" },
  { name: "stopwatch.svg", usedFor: "Stopwatch tab in clock panel", size: "24px", format: "SVG (currentColor)" },
  { name: "pomodoro.svg", usedFor: "Pomodoro / study-session tab", size: "24px", format: "SVG (currentColor)" },
  { name: "note.svg", usedFor: "Notes panel (replaces clip.png)", size: "24px", format: "SVG (currentColor)" },
  { name: "clock.svg", usedFor: "Clock face fallback + context menu", size: "24px", format: "SVG (currentColor)" },
  { name: "wallpaper.svg", usedFor: "Backgrounds section / context menu", size: "24px", format: "SVG (currentColor)" },
  { name: "upload.svg", usedFor: "Upload-from-device action", size: "24px", format: "SVG (currentColor)" },
  { name: "trash.svg", usedFor: "Delete custom background / note", size: "24px", format: "SVG (currentColor)" },
  { name: "pin.svg", usedFor: "Pin note action", size: "24px", format: "SVG (currentColor)" },
  { name: "more-vertical.svg", usedFor: "Context-menu / reveal handle", size: "24px", format: "SVG (currentColor)" },
];

export default MISSING_AUDIO_FILES;
