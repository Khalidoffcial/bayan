const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
const ci = r.audits["cache-insight"];
console.log(JSON.stringify(ci?.details, null, 1).slice(0, 1500));
