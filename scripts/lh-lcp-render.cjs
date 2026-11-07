const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-desktop-2.json", "utf8"));
const items = r.audits["lcp-breakdown-insight"].details.items;
console.log(JSON.stringify(items[0], null, 1)); // phases only
