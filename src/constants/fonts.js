/**
 * fonts — the centralized font catalog for Bayan Space.
 *
 * SINGLE SOURCE OF TRUTH for every selectable font. The Settings UI renders
 * from this list, loadFont.js loads families from it on demand, and the CSS
 * variables (--font-primary/--font-heading) consume its stacks — no component
 * ever hardcodes a font name.
 *
 * Selection rules:
 *  - `arabic`   → full Arabic + Latin coverage; primary for Arabic UI.
 *  - `latin`    → tuned for Latin scripts; when active, a shared Arabic
 *                 fallback (Noto Sans Arabic) is loaded lazily so mixed
 *                 Arabic/English content never falls back to system fonts.
 *  - `multi`    → designed for both scripts natively (e.g. Rubik, IBM Plex).
 *
 * All families are verified Google Fonts (subset=arabic or latin), loaded
 * with display=swap and only the weights the UI actually uses.
 */
export const DEFAULT_FONT = "Zain";

export const FONT_CATEGORIES = [
  { id: "arabic", labelKey: "settings.fonts.cat.arabic" },
  { id: "latin", labelKey: "settings.fonts.cat.latin" },
  { id: "multi", labelKey: "settings.fonts.cat.multi" },
];

/**
 * Google Fonts CSS2 API family name + weight set.
 * weights: the UI uses 400 (body), 600 (emphasis/names), 700 (headings).
 * Arabic display faces that only ship 200–800 variable ranges use their own.
 */
export const FONTS = [
  /* ── Arabic ─────────────────────────────────────────────── */
  { id: "Zain", name: "Zain", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Zain:wght@400;700" },
  { id: "IBM Plex Sans Arabic", name: "IBM Plex Sans Arabic", category: "arabic", weights: "400;600;700", sample: "مساحة للتركيز", gf: "IBM+Plex+Sans+Arabic:wght@400;600;700" },
  { id: "Noto Sans Arabic", name: "Noto Sans Arabic", category: "arabic", weights: "400;600;700", sample: "مساحة للتركيز", gf: "Noto+Sans+Arabic:wght@400;600;700" },
  { id: "Tajawal", name: "Tajawal", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Tajawal:wght@400;700" },
  { id: "Cairo", name: "Cairo", category: "arabic", weights: "400;600;700", sample: "مساحة للتركيز", gf: "Cairo:wght@400;600;700" },
  { id: "Alexandria", name: "Alexandria", category: "arabic", weights: "400;600;700", sample: "مساحة للتركيز", gf: "Alexandria:wght@400;600;700" },
  { id: "Readex Pro", name: "Readex Pro", category: "arabic", weights: "400;600;700", sample: "مساحة للتركيز", gf: "Readex+Pro:wght@400;600;700" },
  { id: "Almarai", name: "Almarai", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Almarai:wght@400;700" },
  { id: "Noto Kufi Arabic", name: "Noto Kufi Arabic", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Noto+Kufi+Arabic:wght@400;700" },
  { id: "Changa", name: "Changa", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Changa:wght@400;700" },
  { id: "Mada", name: "Mada", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Mada:wght@400;700" },
  { id: "Harmattan", name: "Harmattan", category: "arabic", weights: "400;700", sample: "مساحة للتركيز", gf: "Harmattan:wght@400;700" },

  /* ── Multilingual (native Arabic + Latin) ───────────────── */
  { id: "Rubik", name: "Rubik", category: "multi", weights: "400;600;700", sample: "Bayan بيان", gf: "Rubik:wght@400;600;700" },
  { id: "IBM Plex Sans", name: "IBM Plex Sans", category: "multi", weights: "400;600;700", sample: "Bayan بيان", gf: "IBM+Plex+Sans:wght@400;600;700" },

  /* ── Latin (Arabic fallback loaded on demand) ───────────── */
  { id: "Inter", name: "Inter", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Inter:wght@400;600;700" },
  { id: "Roboto", name: "Roboto", category: "latin", weights: "400;700", sample: "A Space to Focus", gf: "Roboto:wght@400;700" },
  { id: "Open Sans", name: "Open Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Open+Sans:wght@400;600;700" },
  { id: "Lato", name: "Lato", category: "latin", weights: "400;700", sample: "A Space to Focus", gf: "Lato:wght@400;700" },
  { id: "Manrope", name: "Manrope", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Manrope:wght@400;600;700" },
  { id: "DM Sans", name: "DM Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "DM+Sans:wght@400;600;700" },
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Plus+Jakarta+Sans:wght@400;600;700" },
  { id: "Work Sans", name: "Work Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Work+Sans:wght@400;600;700" },
  { id: "Nunito Sans", name: "Nunito Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Nunito+Sans:wght@400;600;700" },
  { id: "Source Sans 3", name: "Source Sans 3", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Source+Sans+3:wght@400;600;700" },
  { id: "Ubuntu", name: "Ubuntu", category: "latin", weights: "400;700", sample: "A Space to Focus", gf: "Ubuntu:wght@400;700" },
  { id: "Montserrat", name: "Montserrat", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Montserrat:wght@400;600;700" },
  { id: "Public Sans", name: "Public Sans", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Public+Sans:wght@400;600;700" },
  { id: "Geist", name: "Geist", category: "latin", weights: "400;600;700", sample: "A Space to Focus", gf: "Geist:wght@400;600;700" },
];

/** Fast lookup by id. */
export const fontById = (id) => FONTS.find((f) => f.id === id);

/**
 * The CSS font-family stack for a chosen font id.
 * Arabic UI gets the chosen family first (it covers both scripts),
 * Latin UI gets the chosen Latin family with an Arabic carrier after it,
 * so mixed Arabic/English strings render coherently in both directions.
 */
export const fontStack = (id) => {
  const f = fontById(id);
  if (!f) return DEFAULT_FONT_STACK;
  if (f.category === "latin") {
    return `"${f.name}", "Noto Sans Arabic", "Zain", sans-serif`;
  }
  return `"${f.name}", "Zain", sans-serif`;
};

export const DEFAULT_FONT_STACK = `"${DEFAULT_FONT}", "Noto Sans Arabic", sans-serif`;

export default FONTS;
