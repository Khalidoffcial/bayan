const fs = require("fs");
const path = require("path");
const used = new Set();
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(jsx?|tsx?)$/.test(f)) {
      const src = fs.readFileSync(p, "utf8");
      // only real imports + JSX usages from react-icons/fa
      for (const m of src.matchAll(/import\s*{([^}]+)}\s*from\s*["']react-icons\/fa["']/g)) {
        m[1].split(",").forEach(x => { const name = x.trim().split(/\s+as\s+/)[0]; if (/^Fa/.test(name)) used.add(name); });
      }
    }
  }
}
walk("src");
console.log([...used].sort().join(" "));
console.log("unique icons:", used.size);
