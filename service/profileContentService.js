// ======================================================
// Unified Profile Content Service
// Aggregates a user's posts, replies, articles and novels
// into one chronologically sorted, paginated feed.
//
// Sources (read-only, no copies created):
//   - posts:    posts/posts{id}        (replies live here too, flagged by `comment_on`)
//   - articles: articles/articles{id}
//   - novels:   novels/novels{id}
//   - per-user id lists: user_data/Profile/{id}/posts|articles|novels
//
// Ownership: every item's real author is read from the record itself
// (`autherID`, falling back to `userData.Id_user`), never from the parent.
// The client cannot override ownership — the target user id comes from the
// socket payload only as a lookup key into the user's own id lists.
// Access: everything returned lives in the public canonical collections
// (posts/articles/novels) which are the same records the public feed reads,
// so published-content visibility rules are unchanged. Deleted content is
// skipped naturally (its record is gone / no longer in the user's list).
// ======================================================

const dao = require("../datastore/Dao.js");
const DaoForDbUser = require("../datastore/signin_signupDao_firebase.js");

// Read a single content record by collection + id. Returns null when the
// record was deleted or is missing (never throws — bad ids must not break the page).
async function fetchRecord(collection, id) {
    try {
        let record = null;
        if (collection === "posts") record = await dao.getPostID(id);
        else if (collection === "articles") record = await dao.getArticleID(id);
        else if (collection === "novels") record = await dao.getnovelsID(id);
        if (!record || typeof record !== "object") return null;
        return record;
    } catch (err) {
        console.warn(`profileContent: failed to load ${collection}/${id}:`, err.message);
        return null;
    }
}

// The REAL author of a record — never the parent's author.
function resolveAuthorId(record) {
    return String(
        record?.autherID ??
        record?.userData?.Id_user ??
        record?.Id_user ??
        ""
    );
}

// Unified creation timestamp. Uses the ORIGINAL creation timestamp stored on
// the record (`timestamp` = ms epoch written once at creation, not updated on
// edit). Falls back to parsing `date` ("29 Oct 2025") + `time` ("HH:MM:SS").
// Items without any date sort last, safely, without breaking the page.
function resolveTimestamp(record) {
    const ts = Number(record?.timestamp);
    if (Number.isFinite(ts) && ts > 0) return ts;

    try {
        if (record?.date) {
            const parsed = new Date(`${record.date} ${record.time || ""}`.trim());
            const ms = parsed.getTime();
            if (Number.isFinite(ms)) return ms;
        }
    } catch (_) { /* ignore */ }

    return 0; // no date → sorts last, page still renders
}

// Stable unique key used for dedup across merged sources.
function resolveKey(record, collection) {
    const id = record?.id ?? record?._id ?? record?.id_post;
    return id != null ? String(id) : `${collection}-unknown-${resolveTimestamp(record)}`;
}

// Normalize each record into one shape the frontend renders uniformly.
// Field differences between sources (title/descrip/img/media/content) are
// reconciled HERE so the client never has to guess.
function normalize(record, collection, profileUser) {
    const ts = resolveTimestamp(record);
    const authorId = resolveAuthorId(record);
    const author = record.userData || {
        Id_user: authorId || (profileUser?.id ?? ""),
        F_user: profileUser?.name || "",
        S_user: profileUser?.S_user || profileUser?.F_user || "",
        imgProfile: profileUser?.imgProfile || "",
    };

    return {
        // identity
        id: String(record.id ?? record._id ?? record.id_post ?? ""),
        kind: collection === "posts"
            ? (record.comment_on ? "reply" : "post")
            : collection === "articles" ? "article" : "novel",
        // author (the real writer, not the parent's author)
        autherID: authorId,
        userData: author,
        // post/reply body
        content: record.content || "",
        comment_on: record.comment_on || null,
        parentType: record.parentType || null,
        parentUserData: record.parentUserData || null,
        // article/novel fields
        title: record.title || "",
        descrip: record.descrip || record.description || "",
        // media (posts keep `media`, legacy uses `img`)
        media: Array.isArray(record.media) ? record.media : undefined,
        img: Array.isArray(record.img) ? record.img : [],
        // engagement (when present on the record)
        likesCount: Number(record.likesCount ?? record.likes ?? 0) || 0,
        replyCount: Number(record.replyCount ?? record.commentsCount ?? 0) || 0,
        // timing — original creation only
        timestamp: ts,
        date: record.date || "",
        time: record.time || "",
    };
}

/**
 * Build the unified profile content feed.
 * @param {string} idUser  profile owner (lookup key only)
 * @param {string} type    "all" | "posts" | "articles" | "novels"
 * @param {number} cursor  offset into the sorted merged list
 * @param {number} limit   page size
 */
async function getProfileContent({ idUser, type = "all", cursor = 0, limit = 10 }) {
    if (!idUser) return { items: [], nextCursor: null, counts: {} };

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const safeCursor = Math.max(Number(cursor) || 0, 0);
    const want = String(type || "all").toLowerCase();

    // Which collections to read for this tab.
    const collections = [];
    if (want === "all" || want.includes("post")) collections.push("posts");
    if (want === "all" || want.includes("article")) collections.push("articles");
    if (want === "all" || want.includes("novel")) collections.push("novels");

    // Per-user id lists (targeted reads by user id — never a full DB scan).
    // Replies are NOT excluded just because they carry `comment_on`: they live
    // in the user's own posts list, which is exactly the requested behavior.
    const idLists = await Promise.all(
        collections.map(async (collection) => {
            try {
                const ids = await DaoForDbUser.find_ContentUser_byID(collection, idUser);
                if (Array.isArray(ids)) return { collection, ids };
                if (ids && typeof ids === "object") return { collection, ids: Object.values(ids) };
                return { collection, ids: [] };
            } catch (err) {
                console.warn(`profileContent: no ${collection} list for ${idUser}`);
                return { collection, ids: [] };
            }
        })
    );

    // Fetch every referenced record (deleted/missing ones drop out here).
    const fetched = await Promise.all(
        idLists.flatMap(({ collection, ids }) =>
            ids.map(async (id) => ({ collection, record: await fetchRecord(collection, id) }))
        )
    );

    // Normalize + dedup (same id arriving from more than one source).
    const profileUser = await DaoForDbUser.findbyID(idUser).catch(() => null);
    const byKey = new Map();
    for (const { collection, record } of fetched) {
        if (!record) continue;
        const normalized = normalize(record, collection, profileUser);
        const key = resolveKey(record, collection);
        if (!byKey.has(key)) byKey.set(key, normalized);
    }

    // Single chronological merge — newest first, by ORIGINAL creation time.
    const merged = [...byKey.values()].sort((a, b) => b.timestamp - a.timestamp);

    // Per-tab counts (computed once from the full merged list).
    const counts = { all: merged.length };
    for (const item of merged) counts[item.kind] = (counts[item.kind] || 0) + 1;

    // Offset pagination over the deterministic sorted list — stable across
    // pages, no duplicates, no lost items.
    const page = merged.slice(safeCursor, safeCursor + safeLimit);
    const nextCursor = safeCursor + page.length < merged.length ? safeCursor + page.length : null;

    return { items: page, nextCursor, counts };
}

module.exports = { getProfileContent };
