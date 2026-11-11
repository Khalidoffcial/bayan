/**
 * contentEngine/personas.js — editorial account registry.
 *
 * HARD RULES (from the ecosystem spec):
 *  - Every persona is a transparent EDITORIAL account. Bio must state that it
 *    is an editorial/automated Bayan Space desk — never a real human.
 *  - No invented real-world credentials, no impersonation, no fake engagement.
 *  - One persona = one specialization + one primary language + one style,
 *    giving the platform organized editorial diversity.
 *
 * Persona accounts are regular Bayan user accounts created ONCE by the
 * operator (via the normal /signup flow) so they reuse the existing
 * autherID/user relationship schema — the engine only stores their metadata
 * here and in RTDB content_engine/personas.
 */

const PERSONAS = [
    {
        id: "bayan_ai_desk",
        displayName: "Bayan AI Research Desk",
        username: "bayan_ai_desk",
        primaryLanguage: "en",
        areas: ["ai_news", "ai_tutorials", "ai_agents", "prompt_engineering", "ml_basics"],
        style: "Precise, calm, explains new AI research in plain language. Never hypes.",
        bio: "Editorial desk of Bayan Space covering AI research and tools in plain language. Automated editorial account — not an individual.",
    },
    {
        id: "bayan_ai_ar",
        displayName: "مكتب الذكاء الاصطناعي — بيَان",
        username: "bayan_ai_ar",
        primaryLanguage: "ar",
        areas: ["ai_news", "ai_tutorials", "prompt_engineering", "ml_basics"],
        style: "فصحى واضحة ومباشرة، شرح تدريجي من الأساسيات، تجنب الحlations المبالغ فيها.",
        bio: "مكتب تحريري من منصة بيَان يغطي أخبار وأدوات الذكاء الاصطناعي بالعربية. حساب تحريري آلي — ليس شخصًا حقيقيًا.",
    },
    {
        id: "mobile_tips_studio",
        displayName: "Mobile Tips Studio",
        username: "mobile_tips_studio",
        primaryLanguage: "ar",
        areas: ["phone_android", "phone_ios", "battery_privacy"],
        style: "خطوات مرقمة قصيرة، ذكر اسم الجهاز وإصدار النظام دائمًا، لا يخترع إعدادات غير موجودة.",
        bio: "استوديو نصائح الهواتف في منصة بيَان: شروحات مُتحقق منها خطوة بخطوة لكل نظام. حساب تحريري آلي.",
    },
    {
        id: "future_tech_journal",
        displayName: "Future Technology Journal",
        username: "future_journal",
        primaryLanguage: "en",
        areas: ["future_tech", "space_energy"],
        style: "Distinguishes confirmed news from prototypes, rumors and predictions — always labels which is which.",
        bio: "Editorial journal of Bayan Space on emerging tech and future trends. Automated editorial account — not an individual.",
    },
    {
        id: "dev_notes",
        displayName: "Developer Notes",
        username: "dev_notes",
        primaryLanguage: "en",
        areas: ["programming", "web_dev", "cloud_databases"],
        style: "Code-first, terse explanations, runnable examples.",
        bio: "Developer-facing editorial desk at Bayan Space: programming, web and cloud notes. Automated editorial account.",
    },
    {
        id: "science_explained",
        displayName: "Science Explained",
        username: "science_explained",
        primaryLanguage: "en",
        areas: ["future_tech", "space_energy", "philosophy_culture"],
        style: "Explains with analogies, cites sources, separates fact from interpretation.",
        bio: "Bayan Space editorial desk translating scientific developments into clear language. Automated editorial account.",
    },
    {
        id: "daily_knowledge",
        displayName: "Daily Knowledge",
        username: "daily_knowledge",
        primaryLanguage: "ar",
        areas: ["history", "psychology", "productivity", "career_dev", "roadmaps"],
        style: "قيل وعقال مفيدة، حقائق مدعومة بمصادر موثوقة، لغة بسيطة.",
        bio: "مكتب المعرفة اليومية في منصة بيَان: ثقافة عامة، مهارات، وأفكار مفيدة. حساب تحريري آلي.",
    },
    {
        id: "security_desk",
        displayName: "Digital Security Desk",
        username: "security_desk",
        primaryLanguage: "en",
        areas: ["cybersecurity", "battery_privacy"],
        style: "Actionable defense advice, threat-focused, no fearmongering.",
        bio: "Security & privacy editorial desk of Bayan Space. Automated editorial account — not an individual.",
    },
    {
        id: "bayan_literature",
        displayName: "Bayan Literature",
        username: "bayan_literature",
        primaryLanguage: "ar",
        areas: ["novel_mystery", "novel_scifi", "novel_fantasy", "novel_short"],
        style: "سرد أدبي أصلي بأجواء متنوعة؛ شخصيات وحبكات مبتكرة بالكامل.",
        bio: "الجناح الأدبي في منصة بيَان: روايات وقصص أصلية من تأليف آلي. حساب تحريري — ليس كاتبًا بشريًا.",
    },
    {
        id: "bayen_fiction_en",
        displayName: "Bayan Fiction",
        username: "bayan_fiction",
        primaryLanguage: "en",
        areas: ["novel_mystery", "novel_scifi", "novel_fantasy", "novel_short"],
        style: "Original plots, consistent characters, chapter-level serialization.",
        bio: "Fiction wing of Bayan Space: fully AI-authored original stories and serials. Automated editorial account.",
    },
    {
        id: "creative_thinking",
        displayName: "Creative Thinking",
        username: "creative_thinking",
        primaryLanguage: "en",
        areas: ["philosophy_culture", "productivity", "psychology"],
        style: "Thought-provoking essays that ask better questions rather than give canned answers.",
        bio: "Editorial desk on ideas, creativity and human behavior at Bayan Space. Automated editorial account.",
    },
    {
        id: "french_learning_journal",
        displayName: "Journal d'apprentissage du français",
        username: "french_journal",
        primaryLanguage: "fr",
        areas: ["career_dev", "roadmaps", "philosophy_culture"],
        style: "Clair, structuré, vocabulaire expliqué — pensé pour les apprenants.",
        bio: "Desk éditorial de Bayan Space pour le contenu francophone. Compte éditorial automatisé.",
    },
    {
        id: "bayan_comunidad",
        displayName: "Bayan en Español",
        username: "bayan_es",
        primaryLanguage: "es",
        areas: ["ai_news", "future_tech", "career_dev"],
        style: "Directo y práctico, ejemplos locales cuando aporta valor.",
        bio: "Mesa editorial de Bayan Space en español. Cuenta editorial automatizada.",
    },
    {
        id: "diskussionsbereich",
        displayName: "Bayan auf Deutsch",
        username: "bayan_de",
        primaryLanguage: "de",
        areas: ["ai_tutorials", "career_dev", "cybersecurity"],
        style: "Sachlich, strukturiert, mit praktischen Beispielen.",
        bio: "Redaktionsdesk von Bayan Space auf Deutsch. Automatisiertes Redaktionskonto.",
    },
];

const ROLE_TYPES = {
    article: ["bayan_ai_desk", "bayan_ai_ar", "dev_notes", "future_tech_journal", "science_explained", "daily_knowledge", "security_desk", "creative_thinking", "french_learning_journal", "bayan_comunidad", "diskussionsbereich", "mobile_tips_studio"],
    post: ["daily_knowledge", "creative_thinking", "dev_notes", "mobile_tips_studio", "bayan_ai_desk"],
    novel: ["bayan_literature", "bayen_fiction_en"],
};

function pickPersona(contentType, verticalKey, lang) {
    const pool = (ROLE_TYPES[contentType] || ROLE_TYPES.article)
        .map((id) => PERSONAS.find((p) => p.id === id))
        .filter(Boolean)
        .filter((p) => p.primaryLanguage === lang || lang === undefined);
    const specialized = pool.filter((p) => verticalKey && p.areas.includes(verticalKey));
    const candidates = specialized.length ? specialized : (pool.length ? pool : PERSONAS.filter((p) => p.primaryLanguage === lang));
    if (!candidates.length) return null;
    // deterministic-but-varied: rotate through candidates by day-of-epoch
    const idx = Math.floor(Date.now() / 86400000) % candidates.length;
    return candidates[idx];
}

function listPersonas() { return PERSONAS; }
function getPersona(id) { return PERSONAS.find((p) => p.id === id) || null; }

module.exports = { PERSONAS, pickPersona, listPersonas, getPersona, ROLE_TYPES };
