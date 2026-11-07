/**
 * One-off asset optimizer: converts large PNG/JPG assets in src/assets to
 * WebP using sharp (installed as a devDependency). Run: node scripts/convert-webp.cjs
 * Keeps the original file untouched; writes .webp next to it and prints sizes.
 */
const path = require("path");
const fs = require("fs");

const TARGETS = [
  "src/assets/images/Bayan Space Modern Workspace.png",
  "src/assets/images/bayan-interface.png",
  "src/assets/images/article-reading.png",
  "src/assets/icons/logo.png",
  "src/assets/icons/download.jpg",
];

const ROOT = path.resolve(__dirname, "..");

(async () => {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (e) {
    console.error("sharp not installed — run: npm i -D sharp");
    process.exit(1);
  }
  for (const rel of TARGETS) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) {
      console.warn("skip (missing):", rel);
      continue;
    }
    const out = src.replace(/\.(png|jpe?g)$/i, ".webp");
    const info = await sharp(src, { failOn: "none" })
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
    const before = fs.statSync(src).size;
    const after = fs.statSync(out).size;
    console.log(`${path.basename(rel)}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (${info.width}x${info.height})`);
  }
})();
