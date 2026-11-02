/**
 * i18n system tests — key parity, direction metadata, and completeness.
 */
import en from "./locales/en";
import ar from "./locales/ar";
import fr from "./locales/fr";
import es from "./locales/es";
import de from "./locales/de";
import pt from "./locales/pt";
import tr from "./locales/tr";
import zh from "./locales/zh";
import ja from "./locales/ja";
import ru from "./locales/ru";
import TRANSLATIONS, { getTranslation, getLocaleCompleteness } from "./translations";
import { LANGUAGES, isRtlLanguage } from "../constants/settingsConfig";

const LOCALES = { en, ar, fr, es, de, pt, tr, zh, ja, ru };

describe("i18n — key parity", () => {
  test("every locale file matches the exact key set of en.js", () => {
    const enKeys = Object.keys(en).sort();
    for (const [lang, table] of Object.entries(LOCALES)) {
      if (lang === "en") continue;
      const keys = Object.keys(table).sort();
      const missing = enKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !enKeys.includes(k));
      expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
    }
  });

  test("no duplicate keys inside any locale file", () => {
    for (const [lang, table] of Object.entries(LOCALES)) {
      const keys = Object.keys(table);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  test("all locale values are non-empty strings", () => {
    for (const table of Object.values(LOCALES)) {
      for (const [key, value] of Object.entries(table)) {
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("TRANSLATIONS registry maps every locale id", () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(
      Object.keys(LOCALES).sort()
    );
  });
});

describe("i18n — direction metadata", () => {
  test("LANGUAGES lists exactly the 10 supported locales", () => {
    expect(LANGUAGES.map((l) => l.id).sort()).toEqual(
      Object.keys(LOCALES).sort()
    );
  });

  test("ar is the only RTL language", () => {
    expect(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.id)).toEqual(["ar"]);
    expect(isRtlLanguage("ar")).toBe(true);
    expect(isRtlLanguage("en")).toBe(false);
    expect(isRtlLanguage("zh")).toBe(false);
  });

  test("every language has an untranslatable native name", () => {
    for (const l of LANGUAGES) {
      expect(typeof l.name).toBe("string");
      expect(l.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("i18n — runtime helpers", () => {
  test("getTranslation falls back to en when a key is missing", () => {
    expect(getTranslation("fr", "nonexistent.key")).toBe("nonexistent.key");
    expect(getTranslation("fr", "nonexistent.key", "fallback")).toBe("fallback");
  });

  test("getTranslation substitutes {lang} params", () => {
    expect(getTranslation("en", "translate.to", { lang: "العربية" })).toContain("العربية");
    expect(getTranslation("ar", "translate.to", { lang: "English" })).toContain("English");
  });

  test("getLocaleCompleteness is 1 for complete locales", () => {
    for (const lang of Object.keys(LOCALES)) {
      expect(getLocaleCompleteness(lang)).toBe(1);
    }
  });

  test("getLocaleCompleteness returns 0 for unknown languages", () => {
    expect(getLocaleCompleteness("xx")).toBe(0);
  });
});
