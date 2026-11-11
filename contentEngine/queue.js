/**
 * contentEngine/queue.js — persisted, restart-safe job queue.
 *
 * Jobs live in RTDB content_engine/queue/{jobId} so the pipeline survives
 * process restarts and offline windows (spec §9: recovery when the device
 * returns). Processing is serialized by default (low-RAM host) with retries
 * using exponential backoff. Lifecycle states follow spec §11.
 */

const STATES = [
    "DISCOVERED", "COLLECTED", "CLASSIFIED", "RIGHTS_CHECKED", "DEDUPLICATED",
    "GENERATED", "QUALITY_CHECKED", "PENDING_APPROVAL", "PUBLISHED",
    "FAILED", "REJECTED", "RETRY_WAITING", "ARCHIVED",
];

let rtdb = null;
function init({ dbUsers, fns }) {
    rtdb = { db: dbUsers, ...fns }; // { ref, get, set, update, push, remove }
}

function ensureInit() {
    if (!rtdb) {
        const { db, ref, get, set, update, push, remove } = require("../datastore/firebase");
        init({ dbUsers: db, fns: { ref, get, set, update, push, remove } });
    }
    return rtdb;
}

function path(jobId) { return `content_engine/queue/${jobId}`; }

async function createJob(payload) {
    const { push, set, ref } = ensureInit();
    const jobRef = push(ref(rtdb.db, "content_engine/queue"));
    const job = {
        id: jobRef.key,
        state: "DISCOVERED",
        createdAt: Date.now(),
        attempts: 0,
        nextRunAt: Date.now(),
        history: [{ at: Date.now(), state: "DISCOVERED" }],
        ...payload,
    };
    await set(jobRef, job);
    return job;
}

async function getJob(jobId) {
    const { get, ref } = ensureInit();
    const snap = await get(ref(rtdb.db, path(jobId)));
    return snap.exists() ? snap.val() : null;
}

async function setState(jobId, state, extra = {}) {
    const { update, get, ref } = ensureInit();
    const snap = await get(ref(rtdb.db, path(jobId)));
    const job = snap.exists() ? snap.val() : {};
    const history = Array.isArray(job.history) ? job.history : [];
    history.push({ at: Date.now(), state, ...(extra.note ? { note: String(extra.note).slice(0, 300) } : {}) });
    await update(ref(rtdb.db, path(jobId)), {
        state, history,
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "note")),
    });
}

async function listJobs({ state, limit = 50 } = {}) {
    const { get, ref } = ensureInit();
    const snap = await get(ref(rtdb.db, "content_engine/queue"));
    if (!snap.exists()) return [];
    let items = Object.values(snap.val());
    if (state) items = items.filter((j) => j.state === state);
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return items.slice(0, limit);
}

async function deleteJob(jobId) {
    const { remove, ref } = ensureInit();
    await remove(ref(rtdb.db, path(jobId)));
}

module.exports = { STATES, init, createJob, getJob, setState, listJobs, deleteJob };
