// Test audio-hub endpoints with a real token generated using the same JWT secret
// as the server (reads ACCESS_TOKEN_SECRET from env or falls back to a test value).
process.env.NODE_ENV = "test";

const jwt = require("jsonwebtoken");
const secret = process.env.ACCESS_TOKEN_SECRET || "test-secret-do-not-use-in-prod";
const token = jwt.sign(
  { id: "123456789", name: "AudioHub Tester", username: "audiohub_tester", pass: "x" },
  secret,
  { expiresIn: "1h" }
);

const BASE = "http://localhost:4000";

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

(async () => {
  console.log("== 1. GET /audio-hub/library (empty) ==");
  let r = await req("GET", "/audio-hub/library");
  console.log(r.status, JSON.stringify(r.json).slice(0, 300));

  console.log("\n== 2. GET /audio-hub/search?q=piano ==");
  r = await req("GET", "/audio-hub/search?q=piano");
  console.log(r.status, "items:", (r.json.items || []).length, "cached:", r.json.cached, "rateLimited:", r.json.rateLimited);
  if ((r.json.items || [])[0]) {
    const x = r.json.items[0];
    console.log("first:", JSON.stringify({ id: x.id, title: x.title, author: x.author, license: x.license, source: x.source, audioUrl: x.audioUrl.slice(0, 60) }));
  }

  console.log("\n== 3. Same search again (cache hit) ==");
  r = await req("GET", "/audio-hub/search?q=piano");
  console.log(r.status, "items:", (r.json.items || []).length, "cached:", r.json.cached);

  console.log("\n== 4. PUT /audio-hub/library (favorites + history + progress) ==");
  const track = {
    id: "ov:test-1",
    title: "Test Piano Track",
    author: "Test Artist",
    durationSec: 120,
    thumbnail: "https://example.com/t.png",
    audioUrl: "https://example.com/t.mp3",
    licenseCode: "cc0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    source: "openverse",
    section: "music",
  };
  r = await req("PUT", "/audio-hub/library", {
    favorites: [track],
    history: [{ track, playedSec: 45, durationSec: 120, at: new Date().toISOString() }],
    progress: { "ov:test-1": 42.5 },
    playlists: [{ id: "pl1", name: "Focus Mix", tracks: [track] }],
  });
  console.log(r.status, JSON.stringify(r.json).slice(0, 300));

  console.log("\n== 5. GET /audio-hub/library (after write) ==");
  r = await req("GET", "/audio-hub/library");
  console.log(r.status, "favorites:", (r.json.favorites || []).length, "history:", (r.json.history || []).length, "playlists:", (r.json.playlists || []).length);
  if ((r.json.history || [])[0]) console.log("listened flag:", r.json.history[0].listened, "playedSec:", r.json.history[0].playedSec);
  if (r.json.progress) console.log("progress:", JSON.stringify(r.json.progress));

  console.log("\n== 6. GET /audio-hub/trending ==");
  r = await req("GET", "/audio-hub/trending");
  console.log(r.status, "items:", (r.json.items || []).length);
  if ((r.json.items || [])[0]) console.log("top:", JSON.stringify(r.json.items[0]).slice(0, 200));

  console.log("\n== 7. Injection attempt (bad audioUrl rejected) ==");
  r = await req("PUT", "/audio-hub/library", {
    favorites: [{ ...track, id: "evil", audioUrl: "javascript:alert(1)" }],
  });
  console.log(r.status, "favorites:", (r.json.data?.favorites || []).length);

  console.log("\n== 8. PUT with junk data (validation) ==");
  r = await req("PUT", "/audio-hub/library", { favorites: [{ nonsense: true }] });
  console.log(r.status, JSON.stringify(r.json).slice(0, 200));
})().catch((e) => { console.error("TEST FAILED:", e.message); process.exit(1); });
