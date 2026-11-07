const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
// What audit says about mainthread tasks / long tasks
const lt = r.audits["long-tasks"]?.details?.items || [];
lt.slice(0, 10).forEach((t) => console.log("LONG:", Math.round(t.duration) + "ms", (t.url || "").split("/").pop().slice(0, 50), t.locus || ""));
// dom size
console.log("DOM size:", r.audits["dom-size"]?.displayValue);
// what the biggest chunks are doing: check 383 & 270 content
for (const f of ["383", "270", "451", "404"]) {
  const c = fs.readFileSync(`d:/bayan/bayan/build/static/js/${f}.${{ "383": "29634abd", "270": "3c90dcb1", "451": "0eab4449", "404": "d7b82cb7" }[f]}.chunk.js`, "utf8");
  const keys = {};
  for (const k of ["framer", "motion", "lucide", "react-icons", "gsap", "settingsConfig", "LANGUAGES", "socket"]) keys[k] = (c.match(new RegExp(k, "g")) || []).length;
  console.log(f + ":", JSON.stringify(keys), Math.round(c.length / 1024) + "KB");
}
