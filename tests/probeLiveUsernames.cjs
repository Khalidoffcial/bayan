/**
 * LIVE Firebase probe (READ-ONLY — writes nothing).
 * Verifies against the real RTDB:
 *   1. /username_index exists and how many entries it holds
 *   2. whether any username_index entry conflicts with a DIFFERENT profile's S_user
 *   3. duplicate normalized usernames among existing profiles
 * Run: node tests/probeLiveUsernames.cjs
 */
process.env.NODE_ENV = process.env.NODE_ENV || "production";
const { db, ref, get } = require("../datastore/firebase");
const svc = require("../datastore/username.service.js");

(async () => {
    try {
        const idx = await get(ref(db, svc.USERNAME_INDEX_ROOT));
        const idxCount = idx.exists() ? Object.keys(idx.val() || {}).length : 0;
        console.log("username_index entries:", idxCount);

        const profiles = await get(ref(db, "user_data/Profile"));
        const all = profiles.exists() ? (profiles.val() || {}) : {};
        const profileCount = Object.keys(all).length;
        console.log("user_data/Profile rows:", profileCount);

        // duplicates among profiles (normalized)
        const counts = {};
        for (const [uid, p] of Object.entries(all)) {
            if (!p || typeof p !== "object") continue;
            const n = svc.normalizeUsername(p.S_user || "");
            if (!n.ok) continue;
            (counts[n.key] = counts[n.key] || []).push({ uid, S_user: p.S_user });
        }
        const dups = Object.entries(counts).filter(([, u]) => u.length > 1);
        console.log("duplicate normalized usernames among profiles:", dups.length);
        for (const [key, users] of dups.slice(0, 10)) {
            console.log("  DUP", key, "->", JSON.stringify(users));
        }

        // index coverage: profiles whose normalized username is NOT in the index
        let missing = 0, conflicting = 0;
        const idxVal = idx.exists() ? (idx.val() || {}) : {};
        for (const [uid, p] of Object.entries(all)) {
            if (!p || typeof p !== "object") continue;
            const n = svc.normalizeUsername(p.S_user || "");
            if (!n.ok) continue;
            const entry = idxVal[n.key];
            if (!entry) { missing++; continue; }
            if (String(entry.uid) !== String(uid)) conflicting++;
        }
        console.log("profiles NOT covered by username_index:", missing);
        console.log("profiles whose index entry points to a DIFFERENT uid:", conflicting);
        console.log("PROBE COMPLETE (no writes performed)");
        process.exit(0);
    } catch (e) {
        console.error("PROBE FAILED:", e.code || e.message);
        process.exit(1);
    }
})();
