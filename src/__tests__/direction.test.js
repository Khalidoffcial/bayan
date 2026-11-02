/**
 * Direction architecture tests — the single source of truth for page
 * direction is the selected language via isRtlLanguage().
 * These tests lock the contract so the physical-side bugs cannot return:
 *
 *  1. index.html must NOT hardcode lang="ar" or dir="rtl".
 *  2. html AND body must both be set from the same language map.
 *  3. No CSS may hardcode direction: rtl/ltr on layout containers.
 *  4. No double reflection (flex-direction: row-reverse with dir).
 *  5. Content direction stays independent from UI language.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { SettingsProvider, useSettings } from "../contexts/SettingsContext";
import { LANGUAGES, isRtlLanguage } from "../constants/settingsConfig";

const SRC_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(SRC_ROOT, "..");

// المسارات تُحل من جذر المشروع (bayan/) — لا من __tests__
const read = (rel) => fs.readFileSync(path.join(PROJECT_ROOT, rel), "utf8");

describe("Direction contract — language map is the single source of truth", () => {
  test("exactly ar is RTL; every other supported language is LTR", () => {
    expect(LANGUAGES.find((l) => l.id === "ar").dir).toBe("rtl");
    for (const l of LANGUAGES) {
      if (l.id === "ar") continue;
      expect({ id: l.id, dir: l.dir }).toEqual({ id: l.id, dir: "ltr" });
      expect(isRtlLanguage(l.id)).toBe(false);
    }
    expect(isRtlLanguage("ar")).toBe(true);
  });
});

describe("index.html — no hardcoded direction", () => {
  const html = read("public/index.html");

  test("html tag has no fixed lang/dir attributes", () => {
    expect(html).not.toMatch(/<html[^>]*\slang\s*=\s*["']ar["']/i);
    expect(html).not.toMatch(/<html[^>]*\sdir\s*=/i);
  });

  test("body tag has no hardcoded dir attribute", () => {
    expect(html).not.toMatch(/<body[^>]*\sdir\s*=/i);
  });

  test("bootstraps direction from saved language before first paint", () => {
    expect(html).toMatch(/localStorage\.getItem\(\s*["']language["']\s*\)/);
    expect(html).toMatch(/documentElement\.setAttribute\(\s*["']dir["']/);
    expect(html).toMatch(/document\.body\.setAttribute\(\s*["']dir["']/);
  });
});

describe("SettingsContext — applies direction to html AND body", () => {
  test("sets dir on documentElement and body from isRtlLanguage", () => {
    const src = read("src/contexts/SettingsContext.jsx");
    expect(src).toMatch(/documentElement\.setAttribute\(\s*"dir"/);
    expect(src).toMatch(/document\.body\.setAttribute\(\s*"dir"/);
    expect(src).toMatch(/isRtlLanguage\(language\)/);
  });

  test("no language === 'ar' string comparison remains in direction logic", () => {
    const src = read("src/contexts/SettingsContext.jsx");
    expect(src).not.toMatch(/language\s*===\s*["']ar["']/);
  });
});

describe("CSS — no hardcoded direction on layout containers", () => {
  const cssFiles = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // unreadable dir — skip
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip build output, dependencies, and sibling projects
        if (/^(node_modules|build|\.git|__tests__|coverage|\.next)$/.test(entry.name)) continue;
        walk(full);
      } else if (entry.name.endsWith(".css")) {
        cssFiles.push(full);
      }
    }
  };
  walk(SRC_ROOT);

  const offenders = [];
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rel = path.relative(SRC_ROOT, file);
    for (const rule of css.split("}")) {
      if (!/direction\s*:\s*(rtl|ltr)/.test(rule)) continue;
      const selectors = rule.split("{")[0].trim();
      offenders.push(`${rel}: ${selectors}`);
    }
  }

  test("no CSS rule sets direction: rtl/ltr anywhere", () => {
    expect(offenders).toEqual([]);
  });

  test("no flex-direction: row-reverse (double reflection)", () => {
    for (const file of cssFiles) {
      const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css).not.toMatch(/flex-direction\s*:\s*row-reverse/);
    }
  });
});

describe("Content direction independence", () => {
  test("feed and profile cards derive dir from content, not UI language", () => {
    const postCard = read("src/features/feed/components/PostCard.jsx");
    const profileContent = read("src/features/profile/components/ProfileContent.jsx");
    // dir comes from getDirection(content)
    expect(postCard).toMatch(/getDirection\(item\.content\)/);
    expect(profileContent).toMatch(/getDirection\(item\.content\)/);
    // no physical textAlign mirroring tied to UI dir
    expect(postCard).not.toMatch(/textAlign\s*:/);
    expect(profileContent).not.toMatch(/textAlign\s*:/);
  });

  test("usernames are isolated with <bdi> in reply contexts", () => {
    const postCard = read("src/features/feed/components/PostCard.jsx");
    const profileContent = read("src/features/profile/components/ProfileContent.jsx");
    expect(postCard).toMatch(/<bdi>/);
    expect(profileContent).toMatch(/<bdi>/);
  });
});
