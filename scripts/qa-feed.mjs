export default async function run(page, ui) {
  await page.evaluate(() => { localStorage.setItem("language", "en"); });
  await page.goto("http://localhost:4517/", { waitUntil: "domcontentloaded" }).catch(() => { });
  await page.waitForTimeout(3500);
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  // WebP LCP asset really loaded?
  const heroImgs = await page.evaluate(() =>
    Array.from(document.images).slice(0, 8).map((i) => ({ src: i.currentSrc.split("/").pop(), ok: i.complete && i.naturalWidth > 0 }))
  );
  // Bundle diagnostics: number of JS files and whether heavy libs got loaded eagerly
  const scripts = await page.evaluate(() => Array.from(document.scripts).map((s) => (s.src || "").split("/").pop()).filter(Boolean));
  const mainSize = scripts.filter((s) => s.startsWith("main."));
  return { dir, lang, bodyText, heroImgs, mainSize, scriptCount: scripts.length, scripts };
}
