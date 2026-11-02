/**
 * Sidebar RTL/LTR contract tests.
 *
 * jsdom does not resolve CSS logical properties, so instead of computed
 * styles we verify the stylesheet contract directly:
 *  1. sidebar.css contains NO physical side-locking properties
 *     (left/right insets, border-left/right, margin-left/right,
 *      padding-left/right, text-align: left/right).
 *  2. sidebar.css uses logical properties (inset-inline-start, border-inline-end,
 *     margin-inline-end, padding-inline) which flip automatically with dir.
 *  3. Mobile hide uses translateX(calc(-100% * --dir-factor)) — flips per dir.
 *  4. globals.css defines html[dir="rtl"] { --dir-factor: -1 } and
 *     html[dir="ltr"] { --dir-factor: 1 }.
 *  5. The Sidebar component renders its markup identically in both dirs —
 *     only CSS decides the side.
 */
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../../contexts/SettingsContext";
import Sidebar from "./Sidebar";
import fs from "fs";
import path from "path";

const sidebarCss = fs.readFileSync(
  path.resolve(__dirname, "styles/sidebar.css"),
  "utf8"
);
const globalsCss = fs.readFileSync(
  path.resolve(__dirname, "../../styles/globals.css"),
  "utf8"
);

const renderSidebar = (initialEntries = ["/"]) =>
  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Sidebar />
      </MemoryRouter>
    </SettingsProvider>
  );

describe("Sidebar CSS contract — no physical side-locking", () => {
  test("sidebar.css has no physical left/right inset positioning", () => {
    // Remove comments before scanning
    const css = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/^\s*left\s*:/m);
    expect(css).not.toMatch(/^\s*right\s*:/m);
    expect(css).toMatch(/inset-inline-start\s*:/);
  });

  test("sidebar.css uses border-inline-end (not border-right) to face content", () => {
    const css = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/border-right\s*:/);
    expect(css).not.toMatch(/border-left\s*:/);
    expect(css).toMatch(/border-inline-end\s*:/);
  });

  test("sidebar item spacing uses logical margin/padding, not physical", () => {
    const css = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/margin-left\s*:/);
    expect(css).not.toMatch(/margin-right\s*:/);
    expect(css).not.toMatch(/padding-left\s*:/);
    expect(css).not.toMatch(/padding-right\s*:/);
    // ترتيب العناصر عبر gap منطقي — لا هوامش فيزيائية بين الأيقونة والنص
    expect(css).toMatch(/\.sidebar-item\s*\{[^}]*gap\s*:/);
    expect(css).toMatch(/padding\s*:\s*0\s+14px/); // symmetric shorthand
  });

  test("mobile hide animation flips direction via --dir-factor, not a fixed translateX", () => {
    const css = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/translateX\(calc\(-100%\s*\*\s*var\(--dir-factor,\s*1\)\)\)/);
    // No raw physical translateX(-100%) outside the calc wrapper
    expect(css).not.toMatch(/translateX\(-100%\)/);
  });

  test("hover slide also respects the direction factor", () => {
    const css = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/translateX\(calc\(4px\s*\*\s*var\(--dir-factor/);
  });

  test("globals.css defines --dir-factor for both html directions", () => {
    expect(globalsCss).toMatch(/html\[dir="rtl"\][\s\S]*?--dir-factor\s*:\s*-1/);
    expect(globalsCss).toMatch(/html\[dir="ltr"\][\s\S]*?--dir-factor\s*:\s*1/);
  });
});

describe("Sidebar component — same markup in both directions", () => {
  afterEach(() => {
    document.documentElement.setAttribute("dir", "ltr");
  });

  test("renders identical nav markup when dir is ltr", () => {
    document.documentElement.setAttribute("dir", "ltr");
    const { container } = renderSidebar();
    const items = container.querySelectorAll(".sidebar-item");
    expect(items.length).toBe(6); // 5 channels + settings — لا تبويب حساب
    expect(document.querySelector(".menu-btn")).toBeTruthy();
  });

  test("renders identical nav markup when dir is rtl — CSS decides the side", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const { container } = renderSidebar();
    const items = container.querySelectorAll(".sidebar-item");
    expect(items.length).toBe(6);
    // The component must NOT add any dir-specific classes or inline styles
    const sidebar = container.querySelector(".sidebar");
    expect(sidebar.className).not.toMatch(/rtl|ltr/i);
    expect(sidebar.getAttribute("style")).toBe(null);
  });
});
