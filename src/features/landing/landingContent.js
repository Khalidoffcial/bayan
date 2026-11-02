/**
 * Landing content — مصدر بيانات مركزي للصفحة التعريفية.
 * كل النصوص عبر مفاتيح الترجمة (landing.*) في locales — لا نصوص ثابتة في JSX.
 * الميزات مستخرجة من الكود الفعلي فقط — لا اختلاق.
 */
import allIcon from "../../assets/icons/all.png";
import articleIcon from "../../assets/icons/article.png";
import novelIcon from "../../assets/icons/novel.png";
import examIcon from "../../assets/icons/exam.png";
import focusIcon from "../../assets/icons/allOutline.png";
import workspaceImg from "../../assets/images/Bayan Space Modern Workspace.png";

/** الأقسام/الأنماط الفعلية في المنصة — مستخرجة من Routing والمكونات الحقيقية.
 *  4 Content Modes (routes) + 2 Experience Modes (قراءة/تركيز وسلاسل الروايات).
 *  أي Mode جديد يُضاف هنا ويظهر تلقائيًا في اللاندينج. */
export const LANDING_MODES = [
  { id: "all", icon: allIcon, path: "/", titleKey: "landing.mode.all.title", descKey: "landing.mode.all.desc" },
  { id: "articles", icon: articleIcon, path: "/articles", titleKey: "landing.mode.articles.title", descKey: "landing.mode.articles.desc" },
  { id: "novels", icon: novelIcon, path: "/novels", titleKey: "landing.mode.novels.title", descKey: "landing.mode.novels.desc" },
  { id: "exams", icon: examIcon, path: "/exams", titleKey: "landing.mode.exams.title", descKey: "landing.mode.exams.desc" },
  // Experience Modes — موجودة فعلًا في الإعدادات والمحرر (ReadingFocus + Series)
  { id: "reading", icon: focusIcon, path: "/settings", titleKey: "landing.mode.reading.title", descKey: "landing.mode.reading.desc", isExperience: true },
  { id: "series", icon: novelIcon, path: "/novels", titleKey: "landing.mode.series.title", descKey: "landing.mode.series.desc", isExperience: true },
];

/** صورة واقعية للـ Mode إن توفرت — تستخدم في اللاندينج */
export const MODE_IMAGES = {
  all: workspaceImg,
};

/** المميزات الحقيقية المثبتة في الكود */
export const LANDING_FEATURES = [
  { id: "writer", icon: "✍", titleKey: "landing.feature.writer.title", descKey: "landing.feature.writer.desc" },
  { id: "reading", icon: "◐", titleKey: "landing.feature.reading.title", descKey: "landing.feature.reading.desc" },
  { id: "focus", icon: "◎", titleKey: "landing.feature.focus.title", descKey: "landing.feature.focus.desc" },
  { id: "translate", icon: "文", titleKey: "landing.feature.translate.title", descKey: "landing.feature.translate.desc" },
  { id: "creator", icon: "◇", titleKey: "landing.feature.creator.title", descKey: "landing.feature.creator.desc" },
  { id: "comments", icon: "❝", titleKey: "landing.feature.comments.title", descKey: "landing.feature.comments.desc" },
];

/** روابط الفوتر — لا صفحات وهمية */
export const FOOTER_LINKS = [
  { to: "/privacy", key: "landing.footer.privacy" },
  { to: "/terms", key: "landing.footer.terms" },
  { to: "/cookies", key: "landing.footer.cookies" },
];

export const SOCIAL_LINKS = [
  { href: "https://x.com/theBayanSpace", key: "landing.footer.x", label: "X" },
  { href: "https://www.facebook.com/thebayanspace/", key: "landing.footer.facebook", label: "Facebook" },
];

/** نسخ تسويقية لكل لغة — صياغة طبيعية، لا ترجمة حرفية.
 *  المفتاح = رمز اللغة؛ أي لغة جديدة تُضاف هنا. */
export const HERO_COPY = {
  en: {
    title: "Ideas worth your time.",
    sub: "A quieter corner of the internet for articles, novels and real conversation — built for reading, not scrolling.",
    cta: "Get Started",
    explore: "Explore Bayan",
  },
  ar: {
    title: "مش كل اللي بتقراه بيضيفلك.",
    sub: "مساحة أهدأ للمقالات والروايات والحوار الحقيقي — مصمّمة للقراءة، مش للتمرير.",
    cta: "ابدأ رحلتك",
    explore: "اكتشف بيان",
  },
  fr: {
    title: "Des idées qui méritent votre temps.",
    sub: "Un coin plus calme du web pour les articles, les romans et de vraies conversations — pensé pour lire, pas pour scroller.",
    cta: "Commencer",
    explore: "Découvrir Bayan",
  },
  es: {
    title: "Ideas que valen tu tiempo.",
    sub: "Un rincón más tranquilo de internet para artículos, novelas y conversación real — hecho para leer, no para scrollear.",
    cta: "Comenzar",
    explore: "Explorar Bayan",
  },
  de: {
    title: "Ideen, die deine Zeit wert sind.",
    sub: "Eine ruhigere Ecke des Internets für Artikel, Romane und echte Gespräche — zum Lesen gemacht, nicht zum Scrollen.",
    cta: "Loslegen",
    explore: "Bayan entdecken",
  },
  pt: {
    title: "Ideias que valem o seu tempo.",
    sub: "Um canto mais calmo da internet para artigos, romances e conversa de verdade — feito para ler, não para rolar.",
    cta: "Começar",
    explore: "Explorar o Bayan",
  },
  tr: {
    title: "Zamanına değecek fikirler.",
    sub: "Makaleler, romanlar ve gerçek sohbet için internetin daha sakin bir köşesi — kaydırmak için değil, okumak için tasarlandı.",
    cta: "Başla",
    explore: "Bayan'ı keşfet",
  },
  zh: {
    title: "值得你时间的想法。",
    sub: "互联网上更安静的一角，留给文章、小说和真实的对话——为阅读而生，不为刷屏。",
    cta: "开始使用",
    explore: "探索 Bayan",
  },
  ja: {
    title: "あなたの時間に値するアイデア。",
    sub: "記事、小説、そして本当の対話のために——インターネットのもっと静かな片隅。スクロールのためではなく、読むために。",
    cta: "はじめる",
    explore: "Bayan を見る",
  },
  ru: {
    title: "Идеи, стоящие вашего времени.",
    sub: "Более тихий уголок интернета для статей, романов и настоящих разговоров — создан для чтения, а не для скроллинга.",
    cta: "Начать",
    explore: "Открыть Bayan",
  },
};

/** لماذا Bayan؟ — قيم حقيقية مربوطة بوظائف موجودة */
export const WHY_POINTS = [
  { key: "landing.why.read" },
  { key: "landing.why.discover" },
  { key: "landing.why.focus" },
  { key: "landing.why.variety" },
  { key: "landing.why.voice" },
  { key: "landing.why.daily" },
];
