/**
 * contentEngine/categories.js — dynamic category registry.
 *
 * The existing Bayan keyword classifier (categories.json) uses 10 broad
 * buckets (Religious, Educational, Scientific … ). The Content Engine maps
 * its specialized editorial verticals ONTO those buckets so every generated
 * item feeds the existing `categories/{type}/{bucket}` index unchanged —
 * no parallel taxonomy, no new Firebase paths for the frontend.
 *
 * New verticals can be appended at runtime via the Control Center (they are
 * stored in RTDB content_engine/categories) without touching this file.
 */

const VERTICALS = [
    // key, label, ar label, mapsTo (existing buckets), area
    { key: "ai_news", label: "AI News", ar: "أخبار الذكاء الاصطناعي", mapsTo: ["Technical", "Scientific"], area: "ai" },
    { key: "ai_tutorials", label: "AI Tools & Tutorials", ar: "أدوات وشروحات الذكاء الاصطناعي", mapsTo: ["Technical", "Educational"], area: "ai" },
    { key: "ai_agents", label: "AI Agents & Automation", ar: "وكلاء الذكاء الاصطناعي", mapsTo: ["Technical"], area: "ai" },
    { key: "prompt_engineering", label: "Prompt Engineering", ar: "هندسة الأوامر", mapsTo: ["Technical", "Educational"], area: "ai" },
    { key: "ml_basics", label: "Machine Learning Basics", ar: "أساسيات التعلم الآلي", mapsTo: ["Technical", "Educational"], area: "ai" },
    { key: "programming", label: "Programming", ar: "البرمجة", mapsTo: ["Technical", "Educational"], area: "tech" },
    { key: "web_dev", label: "Web Development", ar: "تطوير الويب", mapsTo: ["Technical"], area: "tech" },
    { key: "cybersecurity", label: "Cybersecurity & Privacy", ar: "الأمن السيبراني والخصوصية", mapsTo: ["Technical"], area: "tech" },
    { key: "cloud_databases", label: "Cloud & Databases", ar: "الحوسبة السحابية وقواعد البيانات", mapsTo: ["Technical"], area: "tech" },
    { key: "hardware", label: "Hardware & Devices", ar: "المكونات والأجهزة", mapsTo: ["Technical"], area: "tech" },
    { key: "phone_android", label: "Android Tips", ar: "نصائح أندرويد", mapsTo: ["Technical"], area: "mobile" },
    { key: "phone_ios", label: "iPhone & iOS Tips", ar: "نصائح آيفون و iOS", mapsTo: ["Technical"], area: "mobile" },
    { key: "battery_privacy", label: "Battery & Privacy", ar: "البطارية والخصوصية", mapsTo: ["Technical"], area: "mobile" },
    { key: "future_tech", label: "Future & Innovation", ar: "المستقبل والابتكار", mapsTo: ["Scientific", "Technical"], area: "future" },
    { key: "space_energy", label: "Space & Energy", ar: "الفضاء والطاقة", mapsTo: ["Scientific"], area: "future" },
    { key: "career_dev", label: "Education & Careers", ar: "التعليم والمسارات المهنية", mapsTo: ["Educational"], area: "education" },
    { key: "roadmaps", label: "Learning Roadmaps", ar: "خرائط التعلم", mapsTo: ["Educational"], area: "education" },
    { key: "productivity", label: "Productivity", ar: "الإنتاجية", mapsTo: ["Social", "Educational"], area: "mind" },
    { key: "psychology", label: "Psychology & Behavior", ar: "النفس والسلوك", mapsTo: ["Social", "Educational"], area: "mind" },
    { key: "philosophy_culture", label: "Philosophy & Culture", ar: "الفلسفة والثقافة", mapsTo: ["Social", "Literary"], area: "mind" },
    { key: "history", label: "History", ar: "التاريخ", mapsTo: ["Educational", "Social"], area: "mind" },
    { key: "novel_mystery", label: "Mystery & Detective", ar: "غموض وتحقيقات", mapsTo: ["Literary"], area: "literature" },
    { key: "novel_scifi", label: "Science Fiction", ar: "الخيال العلمي", mapsTo: ["Literary"], area: "literature" },
    { key: "novel_fantasy", label: "Fantasy", ar: "الفانتازيا", mapsTo: ["Literary"], area: "literature" },
    { key: "novel_short", label: "Short Stories", ar: "قصص قصيرة", mapsTo: ["Literary"], area: "literature" },
    { key: "discussion", label: "Community Discussions", ar: "نقاشات المجتمع", mapsTo: ["Social"], area: "community" },
];

/** extra verticals discovered/added at runtime (Control Center) */
const dynamicVerticals = [];

function allVerticals() { return VERTICALS.concat(dynamicVerticals); }

function getVertical(key) {
    return allVerticals().find((v) => v.key === key) || null;
}

/** Map vertical → existing classifier buckets used by saveContent.js */
function bucketsFor(verticalKey) {
    const v = getVertical(verticalKey);
    return v ? v.mapsTo : ["Educational"];
}

/** Pick the next vertical to cover, honoring coverage gaps + enabled areas. */
function pickVertical({ disabledAreas = [], lastPublished = {} } = {}) {
    const candidates = allVerticals().filter((v) => !disabledAreas.includes(v.area));
    if (!candidates.length) return "ai_news";
    // least-recently-published wins (spread coverage across categories)
    candidates.sort((a, b) => (lastPublished[a.key] || 0) - (lastPublished[b.key] || 0));
    return candidates[0].key;
}

function registerDynamic(v) {
    if (v && v.key && !getVertical(v.key)) dynamicVerticals.push(v);
}

module.exports = { VERTICALS, getVertical, bucketsFor, pickVertical, registerDynamic, allVerticals };
