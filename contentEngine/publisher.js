/**
 * contentEngine/publisher.js — writes into the EXISTING Bayan schema only.
 *
 * Reuses the same shapes that saveContent.js writes:
 *   articles → articles/articles{id}  + categories/articles/{bucket} + user's posts list
 *   novels   → novels/novels{id}      + categories/novels/{bucket}
 *   posts    → posts/posts{id}        + categories/posts/{bucket}
 *
 * Provenance is stored alongside each record under `provenance` (additive —
 * the frontend simply ignores unknown fields) plus a full audit trail in
 * content_engine/published/{id}.
 *
 * This module NEVER touches control_* paths and never bypasses admin auth:
 * publishing is only invoked by the orchestrator after approval, or when
 * approvalRequired=false AND autoPublish=true.
 */

const { db, ref, set, get, update } = require("../datastore/firebaseArticle");
const { db: dbUsers, ref: refUsers, get: getUsers, update: updateUsers, query: queryUsers, orderByChild, equalTo } = require("../datastore/firebase");
const { bucketsFor } = require("./categories");
const config = require("./config");

function nowParts() {
    const d = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
        date: `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`,
        timestamp: Date.now(),
    };
}

/** Resolve the persona's real Bayan user id (autherID) from the registry. */
async function resolveAuthorId(personaId, fallbackAutherId) {
    if (fallbackAutherId) return String(fallbackAutherId);
    const snap = await get(ref(dbUsers, `content_engine/personas/${personaId}`));
    if (snap.exists() && snap.val()?.autherID) return String(snap.val().autherID);
    return null;
}

/** prevent duplicate publication — content hash + explicit id check */
async function alreadyPublished(dedupeKey) {
    const snap = await get(ref(dbUsers, `content_engine/dedupe/${dedupeKey}`));
    return snap.exists();
}

async function recordDedupe(dedupeKey, contentId) {
    await set(ref(dbUsers, `content_engine/dedupe/${dedupeKey}`), {
        contentId, at: Date.now(),
    });
}

/**
 * Publish one approved item into the canonical collections.
 * `item` must already carry: type, vertical, lang, personaId, generated fields,
 * quality result, and provenance block.
 */
async function publish(item) {
    const { type, id } = item;
    if (!["articles", "posts", "novels"].includes(type)) throw new Error("invalid type");
    if (!id) throw new Error("missing id");

    const dedupeKey = item.dedupeKey || `${type}:${item.fingerprint || id}`;
    if (await alreadyPublished(dedupeKey)) {
        return { published: false, reason: "duplicate" };
    }

    const autherID = await resolveAuthorId(item.personaId, item.autherID);
    if (!autherID) throw new Error("persona account not linked — operator must create the editorial account and store autherID in content_engine/personas/{id}");

    const buckets = item.buckets || bucketsFor(item.vertical);
    const categoryObj = {};
    buckets.forEach((b) => { categoryObj[b] = true; });

    const t = nowParts();
    let record;
    if (type === "posts") {
        record = {
            autherID: String(autherID), id: String(id), content: item.content,
            type: "posts", img: Array.isArray(item.img) ? item.img : [],
            time: t.time, date: t.date, timestamp: t.timestamp, category: categoryObj,
            provenance: item.provenance,
        };
    } else {
        record = {
            autherID: String(autherID), id: String(id), title: item.title,
            descrip: item.descrip || "", img: item.img || null,
            series: item.series || null, content: item.content,
            type, time: t.time, date: t.date, timestamp: t.timestamp,
            category: type === "articles" ? categoryObj : item.novelCategory || categoryObj,
            provenance: item.provenance,
        };
    }

    // 1) canonical content write (same path as saveContent.js)
    await set(ref(db, `${type}/${type}${id}`), record);

    // 2) category index (same shape Dao.addContentCategory maintains)
    for (const bucket of (type === "articles" ? buckets : Object.keys(record.category))) {
        const catRef = ref(db, `categories/${type}/${bucket}`);
        const snap = await get(catRef);
        const ids = snap.exists() && Array.isArray(snap.val()) ? snap.val() : [];
        if (!ids.includes(String(id))) ids.push(String(id));
        await set(catRef, ids);
    }

    // 3) author profile list (mirrors sign.addContentId_User)
    const profileSnap = await getUsers(refUsers(dbUsers, `user_data/Profile/${autherID}`));
    if (profileSnap.exists()) {
        const existing = Array.isArray(profileSnap.val()?.[type]) ? profileSnap.val()[type] : [];
        await updateUsers(refUsers(dbUsers, `user_data/Profile/${autherID}`), {
            [type]: [...existing, String(id)],
        });
    }

    // 4) engine-side provenance + lifecycle record
    const pubRecord = {
        contentId: String(id), type, vertical: item.vertical, lang: item.lang,
        personaId: item.personaId, autherID: String(autherID),
        quality: item.quality, sources: item.sources || [],
        provenance: item.provenance, image: item.imageMeta || null,
        publishedAt: t.timestamp, dedupeKey,
    };
    await set(ref(dbUsers, `content_engine/published/${id}`), pubRecord);
    await recordDedupe(dedupeKey, String(id));

    return { published: true, id: String(id), record: pubRecord };
}

/** Count published items in the last 24h (for daily limit enforcement). */
async function publishedLast24h() {
    const cutoff = Date.now() - 86400000;
    const snap = await get(ref(dbUsers, "content_engine/published"));
    if (!snap.exists()) return 0;
    return Object.values(snap.val()).filter((r) => Number(r.publishedAt || 0) >= cutoff).length;
}

module.exports = { publish, publishedLast24h, _internals: { nowParts } };
