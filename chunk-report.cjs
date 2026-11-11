const fs = require("fs");
const path = require("path");
const dir = "build/static/js";
// What's inside chunk 636 (1339 KB!) and 490?
for (const name of ["636.01bfbfa0.chunk.js.map", "490.d42d0f4f.chunk.js.map", "355.abcba1d2.chunk.js.map"]) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const sizes = {};
  (m.sources || []).forEach((s, i) => {
    let base;
    if (s.includes("node_modules")) base = "NM:" + (s.split("node_modules/")[1] || "").split("/").slice(0, 2).join("/");
    else base = "SRC:" + s.replace(/^.*?src\//, "").split("/").slice(0, 3).join("/");
    sizes[base] = (sizes[base] || 0) + (m.sourcesContent[i] || "").length;
  });
  console.log("=== " + name + " ===");
  for (const [k, v] of Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log("  " + String(Math.round(v / 1024)).padStart(5) + " KB  " + k);
  }
}
