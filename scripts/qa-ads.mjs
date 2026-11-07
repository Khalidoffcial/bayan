export default async function run(page, ui) {
  // Landing page (ads prohibited by AdPolicy): reload and count AdSense requests
  await page.evaluate(() => { localStorage.setItem("language", "en"); });
  await page.goto("http://localhost:4517/welcome", { waitUntil: "networkidle" }).catch(() => { });
  await page.waitForTimeout(2500);
  const landingAds = await page.evaluate(() =>
    Array.from(document.scripts).filter((s) => (s.src || "").includes("adsbygoogle")).length);
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
  return { landingAds, dir, lang };
}
