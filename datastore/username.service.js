/**
 * Username uniqueness service — Bayan Space.
 *
 * DESIGN (authoritative server-side uniqueness):
 *
 *   Reservation store:  username_index/<normalized> = { uid, reservedAt }
 *   Profile store:      user_data/Profile/<uid>     = { ..., S_user: "@display" }
 *
 *   - `S_user` on the profile is the DISPLAY username (keeps "@prefix" legacy
 *     format and every existing account untouched). The KEY of username_index
 *     is the normalized username — the authoritative uniqueness token.
 *   - Normalization: trim, lowercase (case-insensitive policy), collapse
 *     internal whitespace, reject characters outside [a-z0-9._\u0600-\u06FF]
 *     (Latin letters/digits, dot, underscore and Arabic letters), length 3-30.
 *     Vowel-less diacritics and tatweel are stripped; Arabic presentation
 *     forms normalized via NFKC.
 *   - Uniqueness is enforced with a Firebase Realtime Database TRANSACTION on
 *     the reservation node: if two requests race, exactly one commit succeeds,
 *     the loser gets USERNAME_TAKEN. The frontend availability check is
 *     INFORMATIONAL ONLY — never the guarantee.
 *   - Release-on-failure: the caller reserves BEFORE the profile write; if the
 *     profile write fails, releaseReservation(uid) removes ONLY the
 *     reservation whose `uid` matches — one user can never release another
 *     user's reservation.
 *   - Username change: reserve new → update profile → release old (only after
 *     the profile write succeeded). On failure at any step the new reservation
 *     is released and the old username is never lost.
 *
 *   NOTE ON "INDEX": Firebase RTDB keys in username_index are the unique
 *   normalized names themselves, so lookup/claim is a single O(1) direct read
 *   — no query, no scan, no second index needed.
 */

const { db, ref, get, set, update, runTransaction } = require("./firebase");

const USERNAME_INDEX_ROOT = "username_index";

// ── Normalization policy (single source of truth) ─────────────────────────
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_ALLOWED = /^[a-z0-9._\u0621-\u064A]+$/; // lowercase Latin, digits, dot, underscore, Arabic letters
const USERNAME_INVALID_MSG =
    "Invalid username: use 3-30 characters, letters (Arabic or English), numbers, dot or underscore only.";

const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g; // harakat, dagger alif, tatweel

/**
 * Normalize a username to its uniqueness key.
 * Returns { ok, key, error } — `key` is null when invalid.
 * Policy: trim → NFKC → strip diacritics/tatweel → lowercase → collapse
 * internal whitespace to nothing → validate charset & length.
 */
function normalizeUsername(raw) {
    if (typeof raw !== "string") return { ok: false, key: null, error: USERNAME_INVALID_MSG };
    let s = raw.trim().normalize("NFKC");
    s = s.replace(ARABIC_DIACRITICS, "");
    s = s.toLowerCase();
    s = s.replace(/\s+/g, ""); // usernames contain no spaces
    if (!s || s.length < USERNAME_MIN || s.length > USERNAME_MAX)
        return { ok: false, key: null, error: USERNAME_INVALID_MSG };
    if (s === "." || s === "_" || s.includes("..") || s.includes("__"))
        return { ok: false, key: null, error: USERNAME_INVALID_MSG };
    if (!USERNAME_ALLOWED.test(s))
        return { ok: false, key: null, error: USERNAME_INVALID_MSG };
    return { ok: true, key: s, error: null };
}

/** The stored/display form: legacy accounts keep the "@..." convention. */
function displayUsername(key) {
    return "@" + key;
}

/**
 * INFORMATIONAL availability check. NOT the uniqueness guarantee —
 * the registration transaction enforces it atomically.
 */
async function isUsernameAvailable(normalizedKey) {
    const snap = await get(ref(db, `${USERNAME_INDEX_ROOT}/${normalizedKey}`));
    return !snap.exists();
}

/**
 * ATOMIC reservation. Firebase RTDB transactions are serialized per node, so
 * concurrent claims of the same key: exactly one commit succeeds.
 *
 * @returns {Promise<{reserved:boolean, owner:string|null}>}
 */
async function reserveUsername(normalizedKey, uid) {
    const tref = ref(db, `${USERNAME_INDEX_ROOT}/${normalizedKey}`);
    const result = await runTransaction(tref, (current) => {
        if (current && typeof current === "object" && current.uid) {
            if (String(current.uid) === String(uid)) {
                // Already ours (idempotent retry after a partial failure) — keep it.
                return { uid: String(uid), reservedAt: current.reservedAt || new Date().toISOString() };
            }
            // Someone else owns it → abort, transaction will retry & fail.
            return undefined; // RTDB abort signal
        }
        if (current !== null && current !== undefined && current !== false) {
            // Legacy/foreign value — treat as taken.
            return undefined;
        }
        return { uid: String(uid), reservedAt: new Date().toISOString() };
    });
    const committed = !!(result && result.committed);
    const owner = committed
        ? String(uid)
        : ((result && result.snapshot && result.snapshot.val() && result.snapshot.val().uid) || null);
    return { reserved: committed, owner };
}

/**
 * Release a reservation — ONLY if it belongs to `uid`.
 * A user can never release (hijack-clear) another user's reservation.
 */
async function releaseUsernameIfOwner(normalizedKey, uid) {
    if (!normalizedKey) return false;
    const tref = ref(db, `${USERNAME_INDEX_ROOT}/${normalizedKey}`);
    const result = await runTransaction(tref, (current) => {
        if (current && typeof current === "object" && String(current.uid) === String(uid)) {
            return null; // delete only our own reservation
        }
        return current; // leave others' reservations untouched
    });
    return !!(result && result.committed);
}

/**
 * Register-time flow: reserve → caller writes profile → on profile failure
 * the caller invokes this rollback. Never leaves orphaned reservations when
 * account creation fails, and never rolls back someone else's reservation.
 */
async function rollbackReservation(normalizedKey, uid) {
    try {
        await releaseUsernameIfOwner(normalizedKey, uid);
    } catch (err) {
        // Rollback is best-effort; a leaked reservation is recoverable by an
        // admin cleanup, whereas a wrongly-released one is not. Log loudly.
        console.error("rollbackReservation failed for", normalizedKey, err.message);
    }
}

/**
 * Username change flow (authoritative order):
 *   1. atomically reserve the NEW username
 *   2. update the profile row (single source for display)
 *   3. release the OLD username — only after 2 succeeded
 * Any failure before step 2 completes releases the new reservation and
 * propagates the error; the user keeps their old username.
 *
 * @returns {Promise<{ok:boolean, previousKey:string|null, error?:string}>}
 */
async function changeUsername({ uid, currentDisplayUsername, newKey }) {
    const claim = await reserveUsername(newKey, uid);
    if (!claim.reserved) return { ok: false, error: "USERNAME_TAKEN" };

    try {
        await update(ref(db, `user_data/Profile/${uid}`), { S_user: displayUsername(newKey) });
    } catch (err) {
        await rollbackReservation(newKey, uid);
        throw err;
    }

    const previousKey = normalizeUsername(currentDisplayUsername || "").key;
    if (previousKey && previousKey !== newKey) {
        await releaseUsernameIfOwner(previousKey, uid).catch((e) =>
            console.error("changeUsername: releasing old username failed:", previousKey, e.message)
        );
    }
    return { ok: true, previousKey };
}

/**
 * Migration helper: scan existing profiles and report duplicate normalized
 * usernames WITHOUT renaming anyone (no silent renames, no data resets).
 * Reads all profiles once — intended for a one-off administrative run.
 *
 * @returns {{ duplicates: Array<{key:string, users:Array<{uid:string, S_user:string, email:string}>}> }}
 */
async function findExistingDuplicates() {
    const snap = await get(ref(db, "user_data/Profile"));
    const conflicts = {};
    if (!snap.exists()) return { duplicates: [] };
    const all = snap.val() || {};
    for (const [uid, profile] of Object.entries(all)) {
        if (!profile || typeof profile !== "object") continue;
        const norm = normalizeUsername(profile.S_user || "");
        if (!norm.ok) continue;
        const entry = { uid, S_user: profile.S_user, email: profile.email || "" };
        (conflicts[norm.key] = conflicts[norm.key] || []).push(entry);
    }
    const duplicates = Object.entries(conflicts)
        .filter(([, users]) => users.length > 1)
        .map(([key, users]) => ({ key, users }));
    return { duplicates };
}

/**
 * Backfill the username_index from existing profiles. Skips keys already
 * reserved by another uid (conflicts from findExistingDuplicates must be
 * resolved manually first). Never renames or deletes any profile row.
 */
async function backfillUsernameIndex() {
    const snap = await get(ref(db, "user_data/Profile"));
    if (!snap.exists()) return { written: 0, skipped: 0 };
    const all = snap.val() || {};
    let written = 0, skipped = 0;
    for (const [uid, profile] of Object.entries(all)) {
        if (!profile || typeof profile !== "object") continue;
        const norm = normalizeUsername(profile.S_user || "");
        if (!norm.ok) { skipped++; continue; }
        const r = await reserveUsername(norm.key, uid);
        if (r.reserved) written++; else skipped++;
    }
    return { written, skipped };
}

module.exports = {
    USERNAME_INDEX_ROOT,
    USERNAME_MIN,
    USERNAME_MAX,
    USERNAME_INVALID_MSG,
    normalizeUsername,
    displayUsername,
    isUsernameAvailable,
    reserveUsername,
    releaseUsernameIfOwner,
    rollbackReservation,
    changeUsername,
    findExistingDuplicates,
    backfillUsernameIndex,
};
