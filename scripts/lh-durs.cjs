const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
const ni = r.audits["network-requests"].details.items;
const doc = ni.find((n) => n.resourceType === "Document");
console.log("doc:", Math.round(doc.networkRequestTime), "-", Math.round(doc.networkEndTime));
const fcp = parseFloat(r.audits["first-contentful-paint"].displayValue) * 1000;
// script fetch duration vs parse: main was 37->111 (74ms) but eval long...
// check a slow-4xx or long-latency item: sort by duration
ni.map((n) => ({ ...n, dur: n.networkEndTime - n.networkRequestTime }))
  .sort((a, b) => b.dur - a.dur)
  .slice(0, 10)
  .forEach((n) => console.log("DUR", Math.round(n.dur) + "ms", n.resourceType, Math.round(n.networkRequestTime) + "->" + Math.round(n.networkEndTime), n.url.split("/").pop().slice(0, 45)));
