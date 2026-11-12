// Safe read-only probe of the Bayan RTDB structure (values summarized, not dumped).
const F = require("./datastore/firebase");
const { db, ref, get } = F;

async function peek(path, opts = {}) {
  try {
    const snap = await get(ref(db, path));
    if (!snap.exists()) { console.log(path, "-> (missing)"); return; }
    const val = snap.val();
    if (Array.isArray(val)) { console.log(path, "-> array, len =", val.length); return; }
    if (typeof val === "object" && val !== null) {
      const keys = Object.keys(val);
      console.log(path, "-> object,", keys.length, "keys; first:", keys.slice(0, 3).join(", "));
      if (opts.sample) {
        const k = keys[0];
        const v = val[k];
        console.log("   sample key:", k, "-> fields:", v && typeof v === "object" ? Object.keys(v).join(",") : typeof v);
      }
    } else {
      console.log(path, "->", typeof val, String(val).slice(0, 80));
    }
  } catch (e) { console.log(path, "-> ERROR", e.message); }
}

(async () => {
  const roots = ["posts", "articles", "novels", "categories", "categories/articles", "categories/posts", "categories/novels",
    "user_data", "user_data/Profile", "books_index", "books_index/doab", "books_index/doab/meta",
    "control_admins", "control_sessions", "control_audit", "control_moderation", "replyIndex", "comments"];
  for (const p of roots) await peek(p, { sample: true });
  // sample one article & one post fully
  for (const t of ["articles", "posts"]) {
    const snap = await get(ref(db, t));
    if (snap.exists()) {
      const first = Object.values(snap.val())[0];
      console.log(`--- sample ${t} record ---`);
      const red = { ...first };
      if (red.content) red.content = String(red.content).slice(0, 120) + "…";
      console.log(JSON.stringify(red, null, 1).slice(0, 1200));
    }
  }
  process.exit(0);
})();
