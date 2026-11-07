const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
const rb = r.audits["render-blocking-insight"];
console.log(JSON.stringify(rb?.details, null, 1).slice(0, 1200));
const cl = r.audits["cumulative-layout-shift"];
const cs = cl?.details?.items;
if (cs) console.log("CLS items:", JSON.stringify(cs).slice(0, 800));
