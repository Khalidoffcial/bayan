const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-desktop-3.json", "utf8"));
const items = r.audits["cls-culprits-insight"].details.items;
console.log(JSON.stringify(items, null, 1).slice(0, 2500));
