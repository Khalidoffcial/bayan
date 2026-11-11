const fs = require("fs");
const path = require("path");
const dir = "build/static/js";
const sizes = {};
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".map")) continue;
  const m = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  (m.sources || []).forEach((s, i) => {
    let base;
    if (s.includes("node_modules")) {
      const nm = s.split("node_modules/")[1] || "";
      base = "NM:" + nm.split("/").slice(0, 2).join("/");
    } else {
      base = "SRC:" + (s.replace(/^.*?src\//, "").split("/")[0] || s);
    }
    const len = (m.sourcesContent && m.sourcesContent[i] ? m.sourcesContent[i].length : 0);
    sizes[base] = (sizes[base] || 0) + len;
  });
}
const sorted = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
let tot = 0;
for (const [k, v] of sorted) { tot += v; console.log(String(Math.round(v / 1024)).padStart(6) + " KB  " + k); }
console.log("TOTAL ~" + Math.round(tot / 1024) + " KB source");
