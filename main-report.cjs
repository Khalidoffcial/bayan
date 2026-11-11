const fs = require("fs");
const path = require("path");
// Which source modules land in main.f9311742.js?
const map = JSON.parse(fs.readFileSync("build/static/js/main.f9311742.js.map", "utf8"));
const sizes = {};
(map.sources || []).forEach((s, i) => {
  const len = map.sourcesContent[i] ? map.sourcesContent[i].length : 0;
  let base;
  if (s.includes("node_modules")) base = "NM:" + (s.split("node_modules/")[1] || "").split("/").slice(0, 2).join("/");
  else base = "SRC:" + s.replace(/^.*?src\//, "");
  sizes[base] = (sizes[base] || 0) + len;
});
const top = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 60);
for (const [k, v] of top) console.log(String(Math.round(v / 1024)).padStart(6) + " KB  " + k);
