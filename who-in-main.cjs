const fs = require("fs");
try {
  const m = JSON.parse(fs.readFileSync("build/static/js/main.f9311742.js.map", "utf8"));
  console.log("sources:", m.sources.length);
  const hits = {};
  m.sources.forEach((s, i) => {
    if (/ckeditor|epub|jszip|gsap|framer|firebase|localforage|xmldom|cropper|engine\.io/i.test(s)) {
      hits[s] = (hits[s] || 0) + (m.sourcesContent[i] || "").length;
    }
  });
  for (const [k, v] of Object.entries(hits).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(Math.round(v / 1024) + " KB  " + k);
  }
} catch (e) {
  console.log("ERR", e.message);
}
