/**
 * books/doabHarvest.js — keeps the DOAB/OAPEN local OAI index fresh.
 *
 * OAI-PMH only supports full listing (no server-side search), so we harvest
 * records into RTDB (books_index/doab) on an interval and serve searches from
 * there. Metadata only — book files stay on the publisher's server.
 */
const { getProvider } = require("./registry");

const BATCH_DELAY_MS = 2000; // polite pause between OAI batches
const MAX_BATCHES_PER_RUN = 40;

/** harvest consecutive batches until resumptionToken is exhausted or cap hit */
async function harvestRun() {
    const doab = getProvider("doab");
    if (!doab) return { added: 0, error: "DOAB_PROVIDER_NOT_INITIALIZED" };
    let totalAdded = 0;
    let token = null;
    let batches = 0;
    try {
        do {
            const r = await doab.harvestBatch({ resumptionToken: token });
            totalAdded += r.added;
            token = r.resumptionToken;
            batches++;
            if (token && batches < MAX_BATCHES_PER_RUN) await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        } while (token && batches < MAX_BATCHES_PER_RUN);
        return { added: totalAdded, batches, exhausted: !token };
    } catch (e) {
        return { added: totalAdded, batches, error: e.message };
    }
}

/** start periodic harvesting (non-blocking; failures are logged, never thrown) */
function startDoabHarvest({ intervalMs = 6 * 60 * 60 * 1000 } = {}) {
    const run = async () => {
        try {
            const r = await harvestRun();
            console.log(`[doab-harvest] added=${r.added} batches=${r.batches || 0}${r.error ? ` error=${r.error}` : ""}${r.exhausted ? " (index complete)" : " (more pending)"}`);
        } catch (e) {
            console.error("[doab-harvest] failed:", e.message);
        }
    };
    // first run shortly after boot, then on the interval
    setTimeout(run, 15000);
    const timer = setInterval(run, intervalMs);
    timer.unref?.();
    return run;
}

module.exports = { harvestRun, startDoabHarvest };
