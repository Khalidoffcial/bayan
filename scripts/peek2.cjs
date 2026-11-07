const fs = require("fs");
const c = fs.readFileSync("d:/bayan/bayan/build/static/js/270.3c90dcb1.chunk.js", "utf8");
const c2 = fs.readFileSync("d:/bayan/bayan/build/static/js/404.d7b82cb7.chunk.js", "utf8");
console.log("270 gsap-context-strings:", ["ScrollTrigger", "gsap.core", "TweenLite", "TimelineLite", "CSSPlugin"].map(k => k + "=" + (c.match(new RegExp(k, "g")) || []).length));
console.log("404 gsap:", ["ScrollTrigger", "TweenLite", "CSSPlugin", "matrix", "gsap"].map(k => k + "=" + (c2.match(new RegExp(k, "g")) || []).length));
console.log("270 has ScrollTrigger:", c.includes("ScrollTrigger"));
