/**
 * AdPolicy tests — the centralized default-deny allowlist.
 *
 * The most important contract: a NEWLY CREATED route shows NO ad unless it
 * is explicitly approved in AD_APPROVED_PAGES.
 */
import {
    AD_APPROVED_PAGES,
    getAdPolicy,
    canShowSidebarAd,
    canShowInArticleAd,
    getSidebarAdPosition,
} from "./AdPolicy";

describe("AdPolicy — approved public routes", () => {
    test("1. public Home route is approved for the sidebar ad only", () => {
        for (const route of ["/", "/all", "/posts", "/articles", "/novels"]) {
            const p = getAdPolicy(route);
            expect(p).not.toBeNull();
            expect(p.page).toBe("home");
            expect(p.sidebarAd).toBe(true);
            expect(p.inArticleAd).toBe(false);
        }
    });

    test("2. public Article route is approved for both units", () => {
        const p = getAdPolicy("/r/abc123", { contentType: "article" });
        expect(p).toEqual({ page: "articleReading", sidebarAd: true, inArticleAd: true });
        expect(canShowSidebarAd("/r/abc123", { contentType: "article" })).toBe(true);
        expect(canShowInArticleAd("/r/abc123", { contentType: "article" })).toBe(true);
    });

    test("3. public Novel route is approved for both units", () => {
        const p = getAdPolicy("/r/novel-9", { contentType: "novel" });
        expect(p).toEqual({ page: "novelReading", sidebarAd: true, inArticleAd: true });
    });

    test("trailing slash is tolerated on approved routes", () => {
        expect(getAdPolicy("/all/")).toEqual(getAdPolicy("/all"));
    });
});

describe("AdPolicy — mandatory exclusions (default-deny)", () => {
    const denied = [
        "4. profile", "/p/someuser",
        "5. settings", "/settings", "/settings/notifications",
        "6. focus space", "/focus", "/focus/session/1",
        "7. login", "/signin",
        "7b. register", "/signup",
        "8. admin/dashboard", "/admin", "/admin/users", "/dashboard",
        "8b. account", "/account",
        "10. unknown route", "/random-unknown",
    ];
    for (let i = 0; i < denied.length; i += 2) {
        // eslint-disable-next-line no-loop-func
        test(`${denied[i]} → no ads at all`, () => {
            expect(getAdPolicy(denied[i + 1])).toBeNull();
            expect(canShowSidebarAd(denied[i + 1])).toBe(false);
            expect(canShowInArticleAd(denied[i + 1])).toBe(false);
        });
    }

    test("post reading route is not an approved page type", () => {
        expect(getAdPolicy("/rp/42")).toBeNull();
    });

    test("9. private or restricted content is denied even on approved routes", () => {
        expect(getAdPolicy("/r/abc", { contentType: "article", visibility: "private" })).toBeNull();
        expect(getAdPolicy("/r/abc", { contentType: "article", restricted: true })).toBeNull();
    });

    test("11. NEWLY ADDED route has no ads until explicitly approved", () => {
        // simulate a future route — nothing in AdPolicy knows it
        expect(canShowSidebarAd("/new-feature-page")).toBe(false);
        expect(canShowInArticleAd("/new-feature-page")).toBe(false);
        // and adding a similar-looking route keeps default-deny
        expect(getAdPolicy("/r/abc/extra/segments")).toBeNull();
        expect(getAdPolicy("/r/")).toBeNull();
    });

    test("in-article ad on /r/:id without contentType defaults to article kind", () => {
        expect(canShowInArticleAd("/r/abc")).toBe(true);
    });

    test("non article/novel contentType on /r/:id gets sidebar but no in-article", () => {
        const p = getAdPolicy("/r/xyz", { contentType: "poem" });
        expect(p.sidebarAd).toBe(true);
        expect(p.inArticleAd).toBe(false);
    });
});

describe("AdPolicy — sidebar position & responsive rules", () => {
    test("12a. LTR places the ad in the RIGHT sidebar (inline-end)", () => {
        const pos = getSidebarAdPosition("ltr", { viewportWidth: 1600 });
        expect(pos.allowed).toBe(true);
        expect(pos.side).toBe("end");
        expect(pos.cssInset).toBe("inset-inline-end");
    });

    test("12b. RTL places the ad in the LEFT sidebar (inline-start)", () => {
        const pos = getSidebarAdPosition("rtl", { viewportWidth: 1600 });
        expect(pos.allowed).toBe(true);
        expect(pos.side).toBe("start");
        expect(pos.cssInset).toBe("inset-inline-start");
    });

    test("13. mobile / layouts without a sidebar region → ad hidden, never a popup", () => {
        expect(getSidebarAdPosition("ltr", { viewportWidth: 800 }).allowed).toBe(false);
        expect(getSidebarAdPosition("rtl", { viewportWidth: 800 }).allowed).toBe(false);
        expect(getSidebarAdPosition("ltr", { viewportWidth: 1600, hasSidebarRegion: false }).allowed).toBe(false);
        expect(getSidebarAdPosition("rtl", { viewportWidth: 1100, hasSidebarRegion: true }).allowed).toBe(false);
    });

    test("tablet band (<1420px) hides the ad regardless of direction", () => {
        expect(getSidebarAdPosition("ltr", { viewportWidth: 1200 }).allowed).toBe(false);
    });
});

describe("AdPolicy — allowlist is the only extension point", () => {
    test("AD_APPROVED_PAGES contains exactly the approved page types", () => {
        expect(Object.keys(AD_APPROVED_PAGES).sort())
            .toEqual(["articleReading", "home", "novelReading"]);
    });

    test("every approved page type carries its unit flags", () => {
        for (const cfg of Object.values(AD_APPROVED_PAGES)) {
            expect(typeof cfg.sidebarAd).toBe("boolean");
            expect(typeof cfg.inArticleAd).toBe("boolean");
        }
    });
});
