const fs = require("fs");
for (const f of ["mobile", "desktop"]) {
  const r = JSON.parse(fs.readFileSync(`d:/bayan/lh-${f}-3.json`, "utf8"));
  const cs = r.audits["cls-culprits-insight"]?.details?.items || [];
  console.log("===", f, "CLS", r.audits["cumulative-layout-shift"].displayValue, "===");
  cs.forEach((c) => console.log(JSON.stringify(c).slice(0, 400)));
}
