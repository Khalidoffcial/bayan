const fs = require("fs");
for (const form of ["mobile", "desktop"]) {
  const r = JSON.parse(fs.readFileSync(`d:/bayan/lh-${form}-2.json`, "utf8"));
  console.log("=== " + form + " ===");
  const ni = r.audits["network-requests"]?.details?.items || [];
  const total = ni.reduce((s, n) => s + (n.transferSize || 0), 0);
  console.log("requests:", ni.length, "transfer:", Math.round(total / 1024) + "KB");
  ni.filter((n) => (n.transferSize || 0) > 15000)
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 12)
    .forEach((m) => console.log(Math.round(m.transferSize / 1024) + "KB", (m.resourceType || "").slice(0, 10), m.url.split("/").pop().slice(0, 60)));
}
