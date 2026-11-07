const fs = require("fs");
const r = JSON.parse(fs.readFileSync("d:/bayan/lh-mobile-2.json", "utf8"));
// main-thread tasks
const mt = r.audits["mainthread-work-breakdown"]?.details?.items || [];
mt.forEach((m) => console.log("MT:", m.groupLabel, Math.round(m.duration) + "ms"));
const boot = r.audits["bootup-time"]?.details?.items || [];
boot.sort((a, b) => b.total - a.total).slice(0, 6).forEach((b) => console.log("JS:", b.url.split("/").pop().slice(0, 50), Math.round(b.total) + "ms"));
// LCP phases
for (const k of ["largest-contentful-paint", "server-response-time", "render-blocking-resources"]) {
  const a = r.audits[k];
  if (a) console.log(k + ":", a.displayValue || a.score, a.details?.items?.length ? JSON.stringify(a.details.items.map(i => i.url || i).map(x => typeof x === 'string' ? x.split('/').pop() : x).slice(0, 5)) : "");
}
