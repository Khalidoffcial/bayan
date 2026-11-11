/**
 * contentEngine/engine.js — orchestrator: scheduler, pipeline, approval flow.
 *
 * Pipeline per job:
 *   DISCOVERED → COLLECTED (source metadata attached, rights note recorded)
 *   → CLASSIFIED (vertical/lang/persona chosen) → RIGHTS_CHECKED
 *   → GENERATED (local Ollama) → QUALITY_CHECKED → PENDING_APPROVAL
 *   → (approval) → PUBLISHED   [or REJECTED / RETRY_WAITING / FAILED]
 *
 * Publishing honors approvalRequired + daily limits + duplicate prevention.
 * The scheduler is an interval loop with graceful shutdown (clearInterval +
 * in-flight promise tracking) — it never blocks or crashes the main server.
 */

const config = require("./config");
const categories = require("./categories");
const personas = require("./personas");
const discovery = require("./discovery");
const generator = require("./generator");
const quality = require("./quality");
const publisher = require("./publisher");
const queue = require("./queue");
const crypto = require("crypto");

let timer = null;
let inFlight = new Set();
let stopping = false;
let bootInfo = { startedAt: null, ticks: 0, lastError: null };

// ── Rights check (spec §5: metadata-only reuse; recorded per job) ───────────
function rightsCheck(source) {
    if (!source) return { ok: true, note: "evergreen/original — no external source" };
    // engine never republishes full text; metadata + link only
    return {
        ok: true,
        note: `metadata-only reuse from ${source.source}; original at ${source.sourceUrl || "n/a"}; license: ${source.license || "unspecified"}`,
        license: source.license || "unspecified",
        sourceUrl: source.sourceUrl || null,
    };
}

// ── Pipeline steps ──────────────────────────────────────────────────────────
async function processJob(job) {
    // fingerprints of recent engine content for dedup
    const recentFingerprints = [];
    try {
        const { db, ref: r, get: g } = require("../datastore/firebase");
        const snap = await g(r(db, "content_engine/published"));
        if (snap.exists()) {
            for (const v of Object.values(snap.val()).slice(-50)) {
                if (v?.dedupeKey?.includes(":")) recentFingerprints.push({ id: v.contentId, fp: quality.shingles(String(v.dedupeKey)) });
            }
        }
    } catch { /* offline ok */ }

    if (!job.topic) throw new Error("job missing topic");
    if (job.state === "PENDING_APPROVAL" || job.state === "REJECTED") return job; // awaiting human

    // COLLECTED + RIGHTS_CHECKED
    const rights = rightsCheck(job.source);
    if (!rights.ok) { await queue.setState(job.id, "FAILED", { note: "rights check failed" }); return; }
    await queue.setState(job.id, "COLLECTED", { note: rights.note });
    await queue.setState(job.id, "RIGHTS_CHECKED", { sourceUrl: rights.sourceUrl, license: rights.license });

    // GENERATED
    let draft;
    const ctx = { topic: job.topic, persona: job.persona, vertical: job.verticalObj, lang: job.lang, source: job.source, type: job.type };
    try {
        if (job.type === "posts") draft = await generator.generatePost(ctx);
        else if (job.type === "novels") draft = await generator.generateNovel({ ...ctx, genreLabel: job.verticalObj?.label, chapterInfo: job.chapterInfo });
        else draft = await generator.generateArticle(ctx);
    } catch (e) {
        if (e.code === "MODEL_UNAVAILABLE" || /fetch failed|ECONNREFUSED/i.test(e.message)) {
            await queue.setState(job.id, "RETRY_WAITING", { note: `model unavailable: ${e.message}` });
            return { retry: true };
        }
        throw e;
    }
    if (!draft || !draft.content || !draft.content.trim()) throw new Error("empty draft");

    // fingerprint dedup BEFORE quality (cheap early exit)
    const fingerprint = crypto.createHash("sha256").update(quality._internals.normalize(draft.content)).digest("hex").slice(0, 16);
    const dedupeKey = `${job.type}:${fingerprint}`;
    try {
        const { db, ref: r, get: g } = require("../datastore/firebase");
        const dup = await g(r(db, `content_engine/dedupe/${dedupeKey}`));
        if (dup.exists()) {
            await queue.setState(job.id, "FAILED", { note: `duplicate of ${dup.val().contentId}` });
            return job;
        }
    } catch { /* offline ok */ }

    await queue.setState(job.id, "GENERATED", { note: `model=${config.ollama.model}` });

    // QUALITY_CHECKED
    const qc = quality.evaluate(
        { ...draft, sources: job.source?.sourceUrl ? [{ url: job.source.sourceUrl, license: job.source.license }] : [] },
        { type: job.type, lang: job.lang, recentFingerprints, sourceUrl: job.source?.sourceUrl }
    );
    await queue.setState(job.id, qc.ok ? "QUALITY_CHECKED" : "REJECTED", {
        note: qc.ok ? `QC score ${qc.score}` : `QC rejected: ${qc.issues.join("; ")}`,
        quality: qc,
    });
    if (!qc.ok) return { rejected: true, qc };

    // CLASSIFIED (after QC so provenance includes chosen buckets)
    const buckets = categories.bucketsFor(job.vertical);
    await queue.setState(job.id, "CLASSIFIED", { buckets });

    // PENDING_APPROVAL — engine stops here unless auto mode is explicitly on
    if (config.approvalRequired || !config.autoPublish) {
        await queue.setState(job.id, "PENDING_APPROVAL");
        return { pendingApproval: true };
    }

    // auto publish path (only when approvalRequired=false && autoPublish=true)
    return approveAndPublish(job.id);
}

/** Called by Control Center approval, or auto mode. */
async function approveAndPublish(jobId, { approvedBy } = {}) {
    const job = await queue.getJob(jobId);
    if (!job) throw new Error("job not found");
    if (job.state !== "PENDING_APPROVAL") throw new Error(`job not in PENDING_APPROVAL (state=${job.state})`);

    // daily limits
    const limits = config.limits;
    const published = await publisher.publishedLast24h();
    if (published >= limits.maxTotalPerDay) {
        await queue.setState(jobId, "RETRY_WAITING", { note: `daily limit reached (${published}/${limits.maxTotalPerDay})` });
        return { deferred: true };
    }

    const result = await publisher.publish({
        type: job.type, id: job.contentId || job.suggestedId || String(Date.now()),
        vertical: job.vertical, lang: job.lang, personaId: job.persona?.id,
        autherID: job.autherID, title: job.draft?.title, descrip: job.draft?.descrip,
        content: job.draft?.content, series: job.series || null,
        img: job.draft?.img || null, imgAlt: job.draft?.imgAlt,
        novelCategory: job.novelCategory, buckets: job.buckets,
        quality: job.quality, sources: job.source?.sourceUrl ? [{ url: job.source.sourceUrl, license: job.source.license, title: job.source.title }] : [],
        dedupeKey: `${job.type}:${job.draftFingerprint || jobId}`,
        imageMeta: job.imageMeta, provenance: {
            generatedBy: `local:${config.ollama.model}`, generatedAt: job.updatedAt || Date.now(),
            topic: job.topic?.title, sourceUrl: job.source?.sourceUrl || null,
            license: job.source?.license || null, pipeline: "bayan-content-engine/1.0",
            approvedBy: approvedBy || "auto-publish",
        },
    });

    await queue.setState(jobId, result.published ? "PUBLISHED" : "FAILED", {
        note: result.published ? `published as ${result.id}` : `publish blocked: ${result.reason}`,
    });
    return result;
}

async function rejectJob(jobId, { rejectedBy, reason } = {}) {
    await queue.setState(jobId, "REJECTED", { note: `rejected by ${rejectedBy || "admin"}: ${reason || "no reason given"}` });
}

async function retryJob(jobId) {
    await queue.setState(jobId, "RETRY_WAITING", { note: "manual retry requested", nextRunAt: Date.now(), attempts: 0 });
}

// ── Scheduler ───────────────────────────────────────────────────────────────
async function tick() {
    if (stopping || !config.enabled) return;
    bootInfo.ticks++;
    try {
        const jobs = await queue.listJobs({ limit: 20 });
        const due = jobs.filter((j) =>
            ["DISCOVERED", "RETRY_WAITING"].includes(j.state) &&
            (!j.nextRunAt || Date.now() >= Number(j.nextRunAt)) &&
            inFlight.size < config.queue.maxConcurrentJobs
        );
        for (const job of due) {
            inFlight.add(job.id);
            (async () => {
                try {
                    const res = await processJob(job);
                    if (res?.retry) {
                        const attempts = (job.attempts || 0) + 1;
                        const backoff = Math.min(
                            config.queue.retryBackoffBaseMs * Math.pow(2, attempts),
                            config.queue.retryBackoffMaxMs
                        );
                        if (attempts > config.queue.maxRetries) {
                            await queue.setState(job.id, "FAILED", { note: "max retries exceeded" });
                        } else {
                            await queue.setState(job.id, "RETRY_WAITING", { attempts, nextRunAt: Date.now() + backoff });
                        }
                    }
                } catch (e) {
                    bootInfo.lastError = e.message;
                    await queue.setState(job.id, "FAILED", { note: e.message }).catch(() => { });
                } finally {
                    inFlight.delete(job.id);
                }
            })();
        }

        // discovery seeding: keep a small buffer of DISCOVERED jobs for each enabled lang
        const enabledLangs = config.languages.filter((l) => l.enabled).map((l) => l.code);
        const bufferMin = 2;
        for (const lang of enabledLangs) {
            const buffer = jobs.filter((j) => j.lang === lang && ["DISCOVERED", "RETRY_WAITING", "PENDING_APPROVAL"].includes(j.state)).length;
            if (buffer < bufferMin) {
                const verticalKey = categories.pickVertical({
                    lastPublished: {}, // TODO: derive from recent published records for smarter gaps
                });
                const verticalObj = categories.getVertical(verticalKey);
                const persona = personas.pickPersona("articles", verticalKey, lang) || personas.listPersonas()[0];
                const topics = await discovery.discover(verticalObj.area, lang);
                const topic = topics[Math.floor(Math.random() * topics.length)];
                await queue.createJob({
                    type: "articles", vertical: verticalKey, verticalObj,
                    lang, persona, topic, source: topic, contentId: `ce${Date.now()}${Math.floor(Math.random() * 900 + 100)}`,
                });
            }
        }
    } catch (e) {
        bootInfo.lastError = e.message;
    }
}

function start() {
    if (timer) return;
    stopping = false;
    bootInfo.startedAt = new Date().toISOString();
    timer = setInterval(tick, config.queue.tickIntervalMs);
    if (timer.unref) timer.unref(); // never keep the process alive just for us
    console.log(`[content-engine] started (approvalRequired=${config.approvalRequired}, autoPublish=${config.autoPublish})`);
}

function stop() {
    stopping = true;
    if (timer) { clearInterval(timer); timer = null; }
    console.log("[content-engine] stopped gracefully");
}

function health() {
    return {
        ...bootInfo,
        enabled: config.enabled,
        approvalRequired: config.approvalRequired,
        autoPublish: config.autoPublish,
        limits: config.limits,
        model: config.ollama.model,
        inFlight: inFlight.size,
        languages: config.languages,
        discovery: discovery.health(),
    };
}

module.exports = { start, stop, tick, processJob, approveAndPublish, rejectJob, retryJob, health, createJobManually: queue.createJob };
