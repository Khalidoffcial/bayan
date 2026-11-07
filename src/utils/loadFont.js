/**
 * loadFont — on-demand Google Fonts loader.
 *
 * Never downloads all families: only the family the user selects (plus the
 * Arabic companion stack for Latin choices) is fetched, the first time it's
 * requested. Requests are deduped in-memory per session and via Google's own
 * CSS cache (`display=swap`, immutable URLs) across sessions — no duplicates.
 *
 * Prefers optimized WOFF2 (Google Fonts serves WOFF2 to all modern browsers
 * automatically via unicode-range splitting) and never blocks rendering.
 */
import { fontById, DEFAULT_FONT } from "../constants/fonts";

const loaded = new Set();
const pending = new Map(); // family → Promise (dedup concurrent requests)

const injectStylesheet = (gfParam) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${gfParam}&display=swap`;
  document.head.appendChild(link);
};

/**
 * Loads a font family's stylesheet. Resolves when the family is usable
 * (document.fonts.load ensures at least one face is ready before we swap
 * the CSS variable — avoids a flash of fallback then reflow).
 */
export const loadFontFamily = (family, { wait = true } = {}) => {
  if (!family || loaded.has(family)) return Promise.resolve();
  if (pending.has(family)) return pending.get(family);

  const meta = fontById(family);
  const gf = meta?.gf || `${family.replace(/ /g, "+")}:wght@400;600;700`;
  injectStylesheet(gf);
  loaded.add(family);

  const target = meta?.weights?.split(";")[0] || "400";

  const promise = (async () => {
    if (!wait || !document.fonts?.load) return;
    try {
      // Preload the regular face for both scripts so live switching lands
      // without a second layout pass.
      await Promise.all([
        document.fonts.load(`400 16px "${family}"`, "بيان Bayan"),
        meta?.weights?.includes("700") && document.fonts.load(`700 16px "${family}"`, "بيان Bayan"),
      ]);
    } catch {
      /* font API unavailable or blocked — the CSS fallback chain still applies */
    }
  })();

  pending.set(family, promise);
  promise.then(() => pending.delete(family));
  return promise;
};

/**
 * Ensures the CSS variables' current font family is actually loaded.
 * Latin choices also pull the Arabic companion (Noto Sans Arabic) once,
 * so mixed-direction content never renders in a system fallback.
 */
export const ensureFontLoaded = async (fontFamily) => {
  if (!fontFamily || fontFamily === DEFAULT_FONT) return;
  const meta = fontById(fontFamily);
  const jobs = [loadFontFamily(fontFamily)];
  // Latin-only fonts need an Arabic carrier for RTL/mixed content.
  if (meta?.category === "latin") jobs.push(loadFontFamily("Noto Sans Arabic"));
  await Promise.all(jobs);
};
