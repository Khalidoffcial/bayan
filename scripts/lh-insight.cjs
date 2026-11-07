const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-desktop-2.json", "utf8"));
console.log("--- LCP-phase trace insights ---");
const keys = Object.keys(r.audits).filter((k) => k.includes("insight"));
keys.forEach((k) => {
  const a = r.audits[k];
  console.log(k, a.displayValue || "", a.metricSavings ? JSON.stringify(a.metricSavings) : "");
});
// The critical insight: LCP phases
const phases = r.audits["lcp-discovery-insight"] || r.audits["lcp-phases-discover-insight"];
for (const k of keys) {
  const items = r.audits[k]?.details?.items;
  if (items && items.length && k.match(/lcp|phase|mainthread/i)) {
    console.log("===", k, "===");
    console.log(JSON.stringify(items, null, 1).slice(0, 1500));
  }
}
