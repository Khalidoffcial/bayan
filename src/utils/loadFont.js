/**
 * loadFont — on-demand Google Fonts loader.
 *
 * The default UI stack is Zain (+ Inter). Cairo and Poppins are only needed
 * when the user picks them in Settings → Appearance; loading all families
 * × weights eagerly costs ~20 font files on first paint. This loader injects
 * the family's stylesheet the first time it's actually requested and caches
 * the choice so it's ready on the next visit too.
 */
const loaded = new Set();

export const loadFontFamily = (family) => {
  if (!family || loaded.has(family)) return;
  loaded.add(family);
  const weights = family === "Cairo" ? "400;600;700" : "400;500;600;700";
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weights}&display=swap`;
  document.head.appendChild(link);
};

/** Ensures the CSS variables' current font family is actually loaded. */
export const ensureFontLoaded = (fontFamily) => {
  if (fontFamily && fontFamily !== "Inter" && fontFamily !== "Zain") {
    loadFontFamily(fontFamily);
  }
};
