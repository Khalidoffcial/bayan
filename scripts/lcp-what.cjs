const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
const lcpAudit = r.audits["largest-contentful-paint-element"];
if (lcpAudit?.details?.items) {
  console.log(JSON.stringify(lcpAudit.details.items, null, 1).slice(0, 1500));
} else {
  // fall back: network-dependent item
  const ni = r.audits["network-requests"]?.details?.items || [];
  const media = ni.filter((n) => /static\/media|fonts/i.test(n.url));
  console.log("media/font requests:");
  media.forEach((m) => console.log(m.transferSize, m.url.split("/").pop()));
  console.log("LCP node label:", r.audits["largest-contentful-paint-element"]?.displayValue);
}
