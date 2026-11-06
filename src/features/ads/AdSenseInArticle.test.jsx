/**
 * Unit tests for the AdSense In-Article integration:
 *  - splitContentForInArticleAd: placement between blocks, short-content exclusion
 *  - AdSenseInArticle: renders only on reading context, exact ids, single push
 */
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
    AdSenseInArticle,
    splitContentForInArticleAd,
    ADSENSE_CLIENT,
    ADSENSE_IN_ARTICLE_SLOT,
} from "./AdSenseInArticle";

const p = (t) => `<p>${t}</p>`;
const seven = Array.from({ length: 7 }, (_, i) => p(`P${i + 1}`)).join("");
const five = Array.from({ length: 5 }, (_, i) => p(`P${i + 1}`)).join("");
const three = Array.from({ length: 3 }, (_, i) => p(`P${i + 1}`)).join("");

describe("splitContentForInArticleAd", () => {
    test("long content: ad after the 4th block, outside any <p>", () => {
        const r = splitContentForInArticleAd(seven);
        expect(r.showAd).toBe(true);
        expect(r.headHtml).toContain("P4");
        expect(r.headHtml).not.toContain("P5");
        expect(r.tailHtml).toContain("P5");
        // never inside a paragraph
        expect(r.headHtml).not.toMatch(/<p>[^<]*$/);
    });

    test("medium content (5 blocks): ad after the 3rd block", () => {
        const r = splitContentForInArticleAd(five);
        expect(r.showAd).toBe(true);
        expect(r.headHtml).toContain("P3");
        expect(r.tailHtml).toContain("P4");
    });

    test("short content (3 blocks): no ad", () => {
        expect(splitContentForInArticleAd(three).showAd).toBe(false);
    });

    test("empty content: no ad", () => {
        expect(splitContentForInArticleAd("").showAd).toBe(false);
    });

    test("single paragraph blob: no ad (never inside a paragraph)", () => {
        expect(splitContentForInArticleAd("<p>one long paragraph only</p>").showAd).toBe(false);
    });
});

describe("AdSenseInArticle", () => {
    const push = jest.fn();

    beforeEach(() => {
        push.mockClear();
        window.adsbygoogle = { push };
    });

    test("renders nothing outside the reading context", () => {
        const { container } = render(
            <MemoryRouter initialEntries={["/settings"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeNull();
    });

    test("renders on /r/:id with exact publisher + slot ids", () => {
        render(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        const ins = document.querySelector("ins.adsbygoogle");
        expect(ins).toBeTruthy();
        expect(ins.getAttribute("data-ad-client")).toBe(ADSENSE_CLIENT);
        expect(ins.getAttribute("data-ad-slot")).toBe(ADSENSE_IN_ARTICLE_SLOT);
        expect(ins.getAttribute("data-ad-layout")).toBe("in-article");
        expect(ins.getAttribute("data-ad-format")).toBe("fluid");
    });

    test("pushes exactly once under React.StrictMode (same instance)", () => {
        render(
            <React.StrictMode>
                <MemoryRouter initialEntries={["/r/abc123"]}>
                    <AdSenseInArticle />
                </MemoryRouter>
            </React.StrictMode>
        );
        expect(push).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith({});
    });

    test("re-renders of the same instance never re-push", () => {
        const { rerender } = render(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        rerender(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        rerender(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        expect(push).toHaveBeenCalledTimes(1);
    });

    test("two separate instances on one page push separately (2 ad positions)", () => {
        render(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
                <AdSenseInArticle />
            </MemoryRouter>
        );
        expect(push).toHaveBeenCalledTimes(2);
        expect(document.querySelectorAll("ins.adsbygoogle")).toHaveLength(2);
    });

    test("no library → silent, no push, no crash", () => {
        delete window.adsbygoogle;
        render(
            <MemoryRouter initialEntries={["/r/abc123"]}>
                <AdSenseInArticle />
            </MemoryRouter>
        );
        expect(document.querySelector("ins.adsbygoogle")).toBeTruthy();
        expect(push).not.toHaveBeenCalled();
    });
});
