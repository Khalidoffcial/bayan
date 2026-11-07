const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
const ni = r.audits["network-requests"].details.items;
// resources that started after 2s (post-load)
console.log("--- late requests (>2s) ---");
ni.filter((n) => n.networkRequestTime > 2000)
  .forEach((n) => console.log(Math.round(n.networkRequestTime) + "-" + Math.round(n.networkEndTime), Math.round((n.transferSize || 0) / 1024) + "KB", n.resourceType, n.url.slice(0, 90)));
console.log("--- render blocking ( Stylesheet/script before FCP) ---");
const fcp = 5000;
ni.filter((n) => n.networkEndTime < fcp && (n.resourceType === "Script" || n.resourceType === "Stylesheet" || n.resourceType === "Document"))
  .forEach((n) => console.log(n.resourceType, Math.round(n.networkRequestTime) + "-" + Math.round(n.networkEndTime), Math.round((n.transferSize || 0) / 1024) + "KB", n.url.split("/").pop().slice(0, 50)));
