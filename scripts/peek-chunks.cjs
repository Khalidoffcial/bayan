const fs = require("fs");
// What module is chunk 270? gsap!
const c = fs.readFileSync("d:/bayan/bayan/build/static/js/270.3c90dcb1.chunk.js", "utf8");
console.log("270 sample:", c.slice(0, 200));
const c2 = fs.readFileSync("d:/bayan/bayan/build/static/js/404.d7b82cb7.chunk.js", "utf8");
console.log("404 sample:", c2.slice(0, 200));
