const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
console.log("--- critical-request-chains / render-blocking ---");
const rb = r.audits["render-blocking-resources"];
if (rb?.details?.items) rb.details.items.forEach((i) => console.log(i.wastedMs + "ms", i.url.split("/").pop().slice(0, 70)));
console.log("--- third-party ---");
const tp = r.audits["third-party-summary"]?.details?.items?.[0];
if (tp) console.log(JSON.stringify(tp).slice(0, 400));
console.log("--- LCP element audit display ---");
for (const k of Object.keys(r.audits)) {
  if (k.includes("largest-content")) console.log(k, "=>", r.audits[k].displayValue, r.audits[k].title);
}
console.log("--- lcp-lazy-loaded / priority ---");
const net = r.audits["network-requests"].details.items;
net.forEach((n) => {
  if (n.resourceType === "Image" || n.resourceType === "Font") {
    console.log(n.resourceType, "start:", Math.round(n.networkRequestTime), "end:", Math.round(n.networkEndTime), n.url.split("/").pop().slice(0, 55));
  }
});
