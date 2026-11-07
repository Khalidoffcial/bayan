const fs = require("fs");
for (const f of ["mobile", "desktop"]) {
  const rows = [];
  for (let i = 1; i <= 3; i++) {
    const r = JSON.parse(fs.readFileSync(`d:/bayan/lh-${f}-${i}.json`, "utf8"));
    const a = r.audits;
    rows.push({
      run: i,
      perf: Math.round(r.categories.performance.score * 100),
      fcp: a["first-contentful-paint"].displayValue,
      lcp: a["largest-contentful-paint"].displayValue,
      tbt: a["total-blocking-time"].displayValue,
      cls: a["cumulative-layout-shift"].displayValue,
      si: a["speed-index"].displayValue,
    });
  }
  console.log(f.toUpperCase());
  rows.forEach((r) => console.log(JSON.stringify(r)));
  const med = (k) => rows.map((r) => parseFloat(r[k])).sort((a, b) => a - b)[1];
  console.log("MEDIAN perf:", med("perf"));
}
