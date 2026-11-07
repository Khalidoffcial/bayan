const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
// simulate throttling settings used
console.log("throttling:", JSON.stringify(r.configSettings.throttling).slice(0, 300));
console.log("formFactor:", r.configSettings.formFactor);
console.log("screenEmulation:", JSON.stringify(r.configSettings.screenEmulation));
// trace LCP timing breakdown
const trace = r["trace"] || r.artifacts?.trace;
console.log("hasTrace:", !!trace);
const audits = ["first-contentful-paint", "largest-contentful-paint", "interactive", "total-blocking-time", "speed-index"];
audits.forEach((k) => console.log(k, r.audits[k]?.displayValue));
// opportunity items
const opps = Object.values(r.audits).filter((a) => a.details?.type === "opportunity" && (a.details.overallSavingsMs || 0) > 100);
opps.forEach((o) => console.log("OPP:", o.id, o.details.overallSavingsMs + "ms", o.title));
