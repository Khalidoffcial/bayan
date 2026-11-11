# Bayan Content Engine — Architecture & Operations Report

**Date:** 2026-11-11 · **Branch:** `cleanup/backend-cleanup` @ `3d1acbb`
**Scope:** autonomous, approval-gated multilingual content ecosystem for Bayan Space.

---

## 1. Database schema findings (ACTUAL, inspected live)

Two RTDB projects are in use — this matches the codebase, not the prompt's assumptions:

| Path | Project | Notes |
|---|---|---|
| `posts/posts{id}`, `articles/article{id}`, `novels/novels{id}` | `tiaralamal` (via `datastore/firebaseArticle.js`, used by `Dao.js`) | content records: `autherID, id, title, descrip, img, content, series, type, time, date, timestamp, category{bucket:true}, likesBy, likesCount, views` |
| `categories/{type}/{bucket}` → array of ids | `tiaralamal` | index maintained by `Dao.addContentCategory` |
| `user_data/Profile/{autherID}.{posts,articles,novels}` | `chatweb-2e06a` (`datastore/firebase.js`) | author→content lists via `sign.addContentId_User` |
| `books_index/doab` | `chatweb-2e06a` | readable anonymously; DOAB harvest exists |
| `control_admins/sessions/audit/moderation`, `posts/articles/...` on `chatweb-2e06a` | `chatweb-2e06a` | **Permission denied** for anonymous client SDK reads — writes must run server-side where the operator holds credentials. The engine therefore writes through the SAME server-side modules the app already uses (`datastore/firebaseArticle`, `datastore/firebase`) |

**Schema contract honored by the publisher (`contentEngine/publisher.js`):**
writes go to `articles/article{id}` / `novels/novels{id}` / `posts/posts{id}`, update the
`categories/{type}/{bucket}` id arrays, and append the id to the author profile list — the
exact triple that `saveContent.js` performs. No parallel database was created. Provenance is
stored **additively** in a `provenance` field on each record (ignored by current readers).

## 2. What was BUILT (completed)

```
backend/bayan-backend/contentEngine/
├── config.js        env-driven configuration; safety defaults (approval ON, autoPublish OFF)
├── categories.js    26 editorial verticals → mapped onto the 10 EXISTING classifier buckets
├── personas.js      14 transparent editorial desks (ar/en/fr/es/de), bios disclose automation
├── discovery.js     OpenAlex / arXiv / Wikimedia / Gutendex metadata discovery + evergreen
│                    fallback; rate-limited (≥4s/source), 6h cache, metadata-only reuse
├── generator.js     local Ollama (Mistral) prompts with hard anti-fabrication contract;
│                    modelStatus() for health; JSON-mode structured drafts
├── quality.js       12-gate QC: length, headings, AI-template phrasing, stats w/o sources,
│                    shingle-Jaccard dedup (≥50% reject / ≥30% warn), safety blocklist,
│                    language-script check, image-alt-text rule, fingerprint hash
├── publisher.js     writes via the EXISTING schema/paths; hash-dedup; 24h limit counter
├── queue.js         RTDB-persisted jobs (`content_engine/queue/{jobId}`), full lifecycle
│                    states, restart-safe
├── engine.js        scheduler (graceful start/stop, unref'd interval), pipeline, retries
│                    with exponential backoff, discovery seeding, approve/reject/retry
├── adminRoutes.js   Control Center endpoints (below), audit-first on every mutation
└── index.js
```

**Integration (2 files changed):**
- `admin/index.js` — engine routes registered inside the existing admin router (same
  `requireAdmin` + per-route RBAC as moderation).
- `mainServer.js` — engine mounted *after* `httpServer.listen`; failure to mount can never
  block the platform; graceful SIGINT/SIGTERM stop.

**Control Center endpoints** (all under `/admin/api/content-engine/*`, all require an admin session):

| Route | Permission | Purpose |
|---|---|---|
| `GET /health` | content.view | model status, queue counts, 24h limits, category/language coverage, personas |
| `GET /queue` | content.view | job list (filter by state) |
| `POST /jobs/:id/actions` | content.edit | approve→publish, reject, retry, archive, delete (audited) |
| `PUT /jobs/:id` | content.edit | edit title/description/content before publishing (audited) |
| `PUT /settings` | system.settings | pause/resume, approval mode, autoPublish, daily limits |
| `GET /published` | content.view | provenance of everything published |
| `POST /published/:id/rollback` | content.delete | archive-and-remove a published item (reversible) |

**Lifecycle** (`queue.STATES`): `DISCOVERED → COLLECTED → CLASSIFIED → RIGHTS_CHECKED →
DEDUPLICATED → GENERATED → QUALITY_CHECKED → PENDING_APPROVAL → PUBLISHED` plus `FAILED`,
`REJECTED`, `RETRY_WAITING`, `ARCHIVED`. Every state change is appended to `job.history`.

**Tests:** `tests/contentEngine.test.js` — 23/23 pass (offline; covers vertical mapping,
persona disclosure, QC gates incl. dedup/stats/safety/alt-text, prompt contract, safety defaults,
lifecycle states). Existing suites re-run: adminCore 13/13, moderation 32/32,
moderationRoutes 29/29, googleAuthSecurity 12/12, securityRegression 18/18,
rbacApiGate 115/115. `uiSecurity.test.js` shows 1 pre-existing failure (stray fixture files
`control-center/ui/_gtxt_test.js`, `_desktop_stage/tests`) — **verified identical before my
changes via `git stash`**; unrelated to this work.

## 3. Connected sources & permissions (list)

| Source | Use | Permission basis |
|---|---|---|
| OpenAlex | paper metadata + abstract reconstruction for topic discovery | metadata CC0; abstracts summarized, never republished |
| arXiv Atom API | recent AI paper metadata | metadata/abstract distribution per arXiv policy; links out |
| Wikimedia Feed API | featured/most-read signals | CC BY-SA — summarize + link only |
| Gutendex | public-domain popularity signals | public domain |
| Evergreen curated list | always-available fallback (no fabricated "trends") | original content |
| Ollama (local Mistral) | generation | runs on-device; no data leaves the machine |

**Not used (deliberately):** GDELT (redistribution terms unclear), full-text news APIs,
anything requiring attribution the engine cannot guarantee.

## 4. Hardware finding — IMPORTANT

The spec assumes a local Ollama + Mistral. **This machine has none:**
- i7-10510U (4C/8T, 1.8–2.3 GHz base/turbo low), **8 GB RAM**, Intel UHD integrated graphics, no NVIDIA GPU
- Ollama: **not installed** (not in PATH, not in Program Files / AppData, port 11434 closed)
- Realistic Mistral-7B (Q4) footprint: 4.1 GB weights + 0.5–1 GB context ⇒ 5–6 GB VRAM/RAM, ~1.5–3 words/s CPU-only on this chip (2–4 GB headroom given Windows + backend + browser)

**Consequence:** the generation step will sit in `RETRY_WAITING` (recoverable) until Ollama
is available. Options, in order of practicality:
1. Install Ollama + `mistral:7b-instruct-v0.2-q4_K_M` — works but ~1 article/15–20 min and heavy RAM contention.
2. Use a smaller model (`qwen2.5:3b-instruct-q4_K_M` via `OLLAMA_MODEL=`) — ~2× faster, quality trade-off.
3. Point `OLLAMA_URL` at Ollama on a stronger machine (config already supports remote URL).

No code change is needed for any option — the engine degrades gracefully.

## 5. Editorial accounts — operator checklist

Personas are *metadata*; each needs a real Bayan account so `autherID` exists:
1. For each persona in `personas.js` (14 entries), sign up via the normal `/signup` flow with its `username`.
2. Store the mapping once: `content_engine/personas/{personaId}` = `{ autherID: "<Id_user>" }` (in `chatweb-2e06a`).
   - Until a persona is linked, publishing its content fails with a clear error — no anonymous posting.
3. Bios already disclose "automated editorial account" (verified by test).

## 6. Initial publishing safety (spec §13)

- `CONTENT_ENGINE_APPROVAL_REQUIRED=true` ships as default — nothing publishes without a Control Center approval.
- Recommended rollout: review the first 20–30 items per type/language, then set
  `approvalRequired=false` via `PUT /settings` (audited). `autoPublish` remains a separate explicit switch.
- Copyright/security/factual QC gates stay mandatory in every mode.

## 7. Resource & cost estimate

- **Backend:** runs inside the existing Express server; 1 concurrent job; RTDB writes ≈ existing traffic scale.
- **Ollama (this machine):** 0 $, but 4–6 GB RAM while generating and slow output (see §4).
- **External APIs:** all chosen sources are free/no-key; engine self-rate-limits.
- **Images:** disabled by default (`CE_IMAGES_ENABLED=false`). When enabled, only Wikimedia
  public-domain/CC results with recorded license + generated alt text — publish *without*
  an image rather than an unrelated one.

## 8. Known limitations / proposed next work

1. **Frontend Control Center UI** for the new endpoints is *proposed* (API is live; UI panels
   under `control-center/ui/src/main.jsx` can consume it like the moderation panel does).
2. Novel serialization (`chapterInfo`) is plumbed but a per-series continuity store is *proposed*.
3. Translation pairs (`sourceLang/targetLang/translationOf`) are recorded in provenance but a
   dedicated adaptation pass (not literal translation) is *proposed* as Phase 2.
4. Category-gap-aware `pickVertical` currently uses a static rotation; wiring real
   published-history weights is *proposed* (hook point marked in `engine.js`).
5. `probe-db.cjs` at backend root was a one-off read-only inspection tool — safe to delete.
6. Anonymous client SDK cannot read most of `chatweb-2e06a` (rules deny it) — all engine writes
   are server-side; keep `FIREBASE_SERVICE_ACCOUNT_JSON` configured on the host for admin
   token verification as already required by P2.

## 9. Deployment instructions

1. `git add contentEngine/ tests/contentEngine.test.js .env.content-engine.example admin/index.js mainServer.js`
2. Copy `.env.content-engine.example` values into the host's `.env` (keep `APPROVAL_REQUIRED=true`).
3. Install/point Ollama per §4; `ollama pull mistral` (or set `OLLAMA_MODEL`).
4. Link persona accounts (§5).
5. Start backend (`npm start`). Watch for `Content Engine scheduler started`.
6. Control Center → `/admin/api/content-engine/health` → review `PENDING_APPROVAL` jobs →
   Approve / Edit / Reject. After the review window, relax approval mode via `PUT /settings`.
