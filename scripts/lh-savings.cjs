const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
// trace-based metric breakdowns exist in LCP audit's "metricSavings"
const lcp = r.audits["largest-contentful-paint"];
console.log("LCP details:", JSON.stringify(lcp.details || {}).slice(0, 500));
console.log("LCP metricSavings:", JSON.stringify(lcp.metricSavings || {}));
// which opportunity affects LCP the most:
console.log("--- all opportunity audits sorted by LCP savings ---");
Object.values(r.audits)
  .filter((a) => a.metricSavings?.LCP)
  .sort((a, b) => (b.metricSavings.LCP || 0) - (a.metricSavings.LCP || 0))
  .slice(0, 8)
  .forEach((a) => console.log(Math.round(a.metricSavings.LCP) + "ms", a.id));
