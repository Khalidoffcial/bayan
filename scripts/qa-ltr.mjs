export default async function run(page, ui) {
  // Force English LTR and reload
  await page.evaluate(() => { localStorage.setItem("language", "en"); });
  await page.goto("http://localhost:4517/welcome", { waitUntil: "networkidle" }).catch(() => { });
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
  const heroTitle = await page.evaluate(() => document.querySelector(".lp-hero__title")?.textContent);
  // AdSense library should NOT be loaded eagerly anymore
  const adsenseScriptCount = await page.evaluate(() =>
    Array.from(document.scripts).filter((s) => (s.src || "").includes("adsbygoogle")).length);
  const adsenseSrcAfterIdle = adsenseScriptCount
    ? await page.evaluate(() => Array.from(document.scripts).find((s) => (s.src || "").includes("adsbygoogle"))?.src || null)
    : null;
  // html2pdf should NOT be loaded eagerly anymore
  const html2pdfLoaded = await page.evaluate(() => typeof window.html2pdf !== "undefined");
  return { dir, lang, heroTitle, adsenseScriptCount, adsenseSrcAfterIdle, html2pdfLoaded };
}
