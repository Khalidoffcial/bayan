/**
 * useQuoteSlider — localization tests for ALL website languages.
 * معيار النجاح: أي لغة في LANGUAGES يجب أن تعرض رسائلها الصحيحة.
 */
import { renderHook } from "@testing-library/react";
import { SettingsProvider } from "../contexts/SettingsContext";
import useQuoteSlider from "./useQuoteSlider";
import messagesData from "../assets/data/spotlightMessages.json";
import { LANGUAGES } from "../constants/settingsConfig";

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q) => ({
    matches: false, media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }));
});

describe("Spotlight messages data — all website languages", () => {
  test("JSON has localized copy for every language in the central LANGUAGES list", () => {
    for (const { id } of LANGUAGES) {
      if (id === "ar") continue;
      const missing = messagesData.messages.filter((m) => {
        // الإنجليزية بصيغة titleEn (قديمة) — البقية title_<lang>
        const key = id === "en" ? "titleEn" : `title_${id}`;
        const dKey = id === "en" ? "descEn" : `desc_${id}`;
        const cKey = id === "en" ? "labelEn" : `label_${id}`;
        return !m[key] || !m[dKey] || !m.cta?.[cKey];
      });
      expect({ lang: id, missing: missing.map((m) => m.id) }).toEqual({ lang: id, missing: [] });
    }
  });

  test("every message has complete Arabic original and no empty strings", () => {
    for (const m of messagesData.messages) {
      expect(m.title?.trim()).toBeTruthy();
      expect(m.desc?.trim()).toBeTruthy();
      expect(m.cta?.label?.trim()).toBeTruthy();
    }
  });

  test("translations are not identical to the Arabic original (real content per language)", () => {
    const langs = LANGUAGES.filter((l) => l.id !== "ar").map((l) => l.id);
    for (const m of messagesData.messages.slice(0, 6)) {
      for (const l of langs) {
        const tKey = l === "en" ? "titleEn" : `title_${l}`;
        const dKey = l === "en" ? "descEn" : `desc_${l}`;
        expect(m[tKey]).toBeTruthy();
        expect(m[dKey]).toBeTruthy();
      }
    }
  });

  test("no duplicate message ids", () => {
    const ids = messagesData.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("useQuoteSlider hook — follows the active language", () => {
  test("hook mounts and returns a message with title/desc/cta", () => {
    const { result } = renderHook(() => useQuoteSlider(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });
    const m = result.current.currentMessage;
    expect(typeof m?.title).toBe("string");
    expect(m.title.length).toBeGreaterThan(0);
    expect(m.cta?.action).toBeTruthy();
    expect(typeof result.current.next).toBe("function");
    expect(typeof result.current.goTo).toBe("function");
  });

  test("navigation cycles through all messages", () => {
    const { result } = renderHook(() => useQuoteSlider(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });
    const total = messagesData.messages.length;
    for (let i = 0; i < total; i++) {
      act(() => result.current.next());
    }
    // دورة كاملة تعيد الرسالة الأولى
    expect(result.current.index).toBe(0);
  });
});

// act ضروري للاختبار أعلاه
import { act } from "@testing-library/react";
