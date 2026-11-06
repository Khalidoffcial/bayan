/**
 * Unit tests for the AdSense Sidebar display unit (slot 8671904268):
 *  - renders only on eligible contexts with rail space
 *  - exact publisher + slot ids (distinct from the in-article slot)
 *  - single push under React.StrictMode / re-renders
 *  - RTL/LTR direction data attribute from real language state
 *  - silent when the library is missing
 */
import React, { act } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../../contexts/SettingsContext";
import {
    AdSenseSidebar,
    ADSENSE_SIDEBAR_SLOT,
} from "./AdSenseSidebar";
import { ADSENSE_CLIENT } from "./AdSenseInArticle";

const renderAt = (path, { strict = false } = {}) => {
    const tree = (
        <SettingsProvider>
            <MemoryRouter initialEntries={[path]}>
                <AdSenseSidebar />
            </MemoryRouter>
        </SettingsProvider>
    );
    return strict ? render(<React.StrictMode>{tree}</React.StrictMode>) : render(tree);
};

/* jsdom is 1024px wide — smaller than the 1420px rail threshold, so widen. */
beforeAll(() => {
    Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
});

describe("AdSenseSidebar", () => {
    const push = jest.fn();
    beforeEach(() => {
        push.mockClear();
        window.adsbygoogle = { push };
    });

    test("renders on content pages with exact publisher + slot ids", () => {
        renderAt("/");
        const ins = document.querySelector(".adsense-sidebar ins.adsbygoogle");
        expect(ins).toBeTruthy();
        expect(ins.getAttribute("data-ad-client")).toBe(ADSENSE_CLIENT);
        expect(ins.getAttribute("data-ad-slot")).toBe(ADSENSE_SIDEBAR_SLOT);
        expect(ins.getAttribute("data-ad-slot")).not.toBe("1256448677"); // separate from in-article
        expect(ins.getAttribute("data-ad-format")).toBe("auto");
        expect(ins.getAttribute("data-full-width-responsive")).toBe("true");
        expect(push).toHaveBeenCalledWith({});
    });

    test("renders on the reading rail too (outside the content area)", () => {
        renderAt("/r/abc123");
        expect(document.querySelector(".adsense-sidebar")).toBeTruthy();
    });

    test("never renders on excluded routes", () => {
        for (const p of ["/p/1", "/settings", "/focus", "/signin", "/signup", "/welcome", "/privacy"]) {
            const { container } = renderAt(p);
            expect(container.firstChild).toBeNull();
            expect(push).not.toHaveBeenCalled();
        }
    });

    test("no rail space (narrow screen) → nothing renders, no popup/overlay", () => {
        Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
        const { container } = renderAt("/");
        expect(container.firstChild).toBeNull();
        Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
    });

    test("pushes exactly once under React.StrictMode", () => {
        renderAt("/", { strict: true });
        expect(push).toHaveBeenCalledTimes(1);
    });

    test("re-renders of the same instance never re-push", () => {
        const { rerender } = render(
            <SettingsProvider>
                <MemoryRouter initialEntries={["/"]}>
                    <AdSenseSidebar />
                </MemoryRouter>
            </SettingsProvider>
        );
        rerender(
            <SettingsProvider>
                <MemoryRouter initialEntries={["/"]}>
                    <AdSenseSidebar />
                </MemoryRouter>
            </SettingsProvider>
        );
        rerender(
            <SettingsProvider>
                <MemoryRouter initialEntries={["/"]}>
                    <AdSenseSidebar />
                </MemoryRouter>
            </SettingsProvider>
        );
        expect(push).toHaveBeenCalledTimes(1);
    });

    test("RTL language places the rail inline-start (dir attribute from real state)", () => {
        localStorage.setItem("language", "ar");
        renderAt("/");
        const box = document.querySelector(".adsense-sidebar");
        expect(box.getAttribute("dir")).toBe("rtl");
        localStorage.setItem("language", "en");
    });

    test("no fill after grace period → unit is removed, no tall empty box", async () => {
        jest.useFakeTimers();
        const { container } = renderAt("/");
        expect(document.querySelector(".adsense-sidebar")).toBeTruthy();
        await act(async () => {
            jest.advanceTimersByTime(5100);
        });
        // no data-ad-status="fill" → the component unmounts the unit
        expect(container.querySelector(".adsense-sidebar")).toBeNull();
        jest.useRealTimers();
    });

    test("no library → silent, no push, no crash", () => {
        delete window.adsbygoogle;
        renderAt("/");
        expect(document.querySelector(".adsense-sidebar")).toBeTruthy();
        expect(push).not.toHaveBeenCalled();
    });
});
