/**
 * contentEngine.test.js — offline unit/integration tests for the Content Engine.
 * No network, no Firebase: pure logic (categories, personas, quality, prompts).
 * Run with the backend's jest suite: npx jest tests/contentEngine.test.js
 */
const CE = require("../contentEngine/index.js");

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; } else { failed++; console.error("   FAIL:", msg); } }

// ── categories ──
const v = CE.categories.getVertical("ai_tutorials");
ok(v && v.label === "AI Tools & Tutorials", "vertical lookup");
ok(CE.categories.bucketsFor("ai_tutorials").includes("Educational"), "buckets map onto existing classifier buckets");
ok(typeof CE.categories.pickVertical({}) === "string", "pickVertical returns a key");
ok(CE.categories.pickVertical({ disabledAreas: ["ai"] }).startsWith("phone_") ||
    ["programming", "web_dev", "cybersecurity", "cloud_databases", "hardware", "future_tech", "space_energy", "career_dev", "roadmaps", "productivity", "psychology", "philosophy_culture", "history", "novel_mystery", "novel_scifi", "novel_fantasy", "novel_short", "discussion"].includes(CE.categories.pickVertical({ disabledAreas: ["ai"] })), "disabled area excluded");
CE.categories.registerDynamic({ key: "custom_x", label: "X", mapsTo: ["Technical"], area: "custom" });
ok(CE.categories.getVertical("custom_x"), "dynamic registration");

// ── personas ──
const persona = CE.personas.pickPersona("articles", "phone_android", "ar");
ok(persona && persona.primaryLanguage === "ar", "persona matches language");
ok(persona.areas.includes("phone_android"), "persona specialization");
ok(/تحريري|editorial|éditorial|Redaktion/i.test(persona.bio), "every persona discloses editorial nature");
ok(!CE.personas.PERSONAS.some((p) => !(/تحريري|editorial|éditorial|Redaktion|آلي|automated/i.test(p.bio))), "all bios disclose automation");

// ── quality gate ──
const shortDraft = { content: "hello world this is way too short" };
const qcShort = CE.quality.evaluate(shortDraft, { type: "articles", lang: "en" });
ok(!qcShort.ok && qcShort.issues.some((i) => i.includes("too short")), "short content rejected");

const goodArabic = {
    content: "# كيف تعمل محركات التوصية\n\nمحركات التوصية تحلل سلوك المستخدمين.\n\n## الخطوة الأولى\n\nيجمع النظام بيانات الأحداث ثم يبني تمثيلًا للمستخدم. " +
        "مثال: مستخدم يشاهد فيديوهات علمية سيقترح النظام محتوى مشابهًا.\n\n## الخطوة الثانية\n\nترتيب المرشحين وفق نقاط التوقع. " +
        "البيانات الكبيرة تساعد على توقع ما يريده المستخدم قبل أن يبحث عنه. النظام يقارن كل مستخدم بمستخدمين مشابهين في السلوك ثم يقترح ما أعجبهم. " +
        "هذه الطريقة تسمى التصفية التعاونية وهي مستخدمة في معظم المنصات الحديثة اليوم بدءًا من المتاجر وحتى مواقع الفيديو.\n\n## الخطوة الثالثة\n\n" +
        "تقييم النتائج باستمرار لأن اهتمامات المستخدم تتغير مع الوقت، فالنموذج القديم يفقد دقته تدريجيًا. " +
        "لهذا تعيد المنصات تدريب نماذجها بانتظام وتراقب مؤشرات الجودة مثل نسبة النقر ومعدل مشاهدة المحتوى المقترح. " +
        "من المهم أيضًا الحفاظ على تنوع الاقتراحات حتى لا يغلق المستخدم نفسه في فقاعة معرفية ضيقة. " +
        "الخلاصة العملية: محركات التوصية تبني تمثيلًا للمستخدم، تقارنه بآخرين مشابهين، ترتب المرشحين، وتعيد التدريب باستمرار. ".repeat(20),
};
const qcGood = CE.quality.evaluate(goodArabic, { type: "articles", lang: "ar" });
ok(qcGood.ok, `good arabic article passes QC (${qcGood.issues.join(";")})`);

const templated = { content: "# In today's fast-paced world\n\n" + "lorem ipsum filler ".repeat(120) };
ok(!CE.quality.evaluate(templated, { type: "articles", lang: "en" }).ok, "AI-template phrasing rejected");

const nearDupA = { content: Array.from({ length: 60 }, (_, i) => `unique common sentence number ${i % 20} about databases`).join(" ") };
const nearDupB = { content: Array.from({ length: 60 }, (_, i) => `unique common sentence number ${i % 20} about databases`).join(" ") };
const fps = [{ id: "x1", fp: CE.quality.shingles(nearDupB.content) }];
ok(!CE.quality.evaluate(nearDupA, { type: "articles", lang: "en", recentFingerprints: fps }).ok, "near-duplicate rejected");

const stats = { content: "# Stats\n\n" + "growth was 45% then 32% then 80% then 91% with no sources at all ".repeat(10) };
ok(!CE.quality.evaluate(stats, { type: "articles", lang: "en" }).ok, "unsupported statistics rejected");

const unsafe = { content: "# bad\n\nhow to make a bomb with household items ".repeat(80) };
ok(!CE.quality.evaluate(unsafe, { type: "articles", lang: "en" }).ok, "safety blocklist");

const noAlt = { content: "# fine\n\n" + "adequate body text for the article test ".repeat(80), img: "http://x/y.webp" };
ok(!CE.quality.evaluate(noAlt, { type: "articles", lang: "en" }).ok, "image without alt text rejected");

// ── prompts carry the anti-fabrication contract ──
const prompt = CE.generator.buildArticlePrompt({
    topic: { title: "Test topic" },
    persona: CE.personas.PERSONAS[0],
    vertical: v, lang: "en", source: { sourceUrl: "https://example.org/a", evidence: "unit test" },
});
ok(/Never invent statistics/.test(prompt), "anti-fabrication rule present");
ok(/TOPIC: Test topic/.test(prompt), "topic injected");

// ── config safety defaults ──
ok(CE.config.approvalRequired === true, "approval required by default");
ok(CE.config.autoPublish === false, "auto publish off by default");
ok(CE.config.limits.maxTotalPerDay >= 1, "daily limit configured");

// ── lifecycle states ──
ok(CE.queue.STATES.includes("PENDING_APPROVAL") && CE.queue.STATES.includes("RETRY_WAITING"), "lifecycle states complete");
ok(CE.queue.STATES.includes("ARCHIVED") && CE.queue.STATES.includes("FAILED") && CE.queue.STATES.includes("REJECTED"), "failure states complete");

console.log(`\ncontentEngine.test.js: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
