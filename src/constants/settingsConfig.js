// Settings config — ثوابت فقط، النصوص الظاهرة تُترجم عبر i18n/useTranslation
export const THEMES = ["light", "dark", "system"];

export const FONT_SIZES = ["small", "medium", "large"];

export const FONT_FAMILIES = [
  { id: "Inter", sample: "Aa" },
  { id: "Poppins", sample: "Aa" },
  { id: "Cairo", sample: "أأ" },
];

/**
 * اللغات المدعومة للواجهة.
 * name = اسم اللغة بلغتها الأصلية (لا يُترجم أبدًا) — علامة Bayan Space تبقى "Bayan".
 * dir = اتجاه الواجهة؛ أضف rtl هنا لأي لغة جديدة من اليمين لليسار.
 * ملاحظة: اللغة المعروضة في الإعدادات تُحدد من نسبة الاكتمال في i18n/translations.js
 * (getLocaleCompleteness) — لغة ناقصة تُوسم "ترجمة غير مكتملة" ولا تُدّعى اكتمالها.
 */
export const LANGUAGES = [
  { id: "en", dir: "ltr", name: "English" },
  { id: "ar", dir: "rtl", name: "العربية (مصري)" },
  { id: "fr", dir: "ltr", name: "Français" },
  { id: "es", dir: "ltr", name: "Español" },
  { id: "de", dir: "ltr", name: "Deutsch" },
  { id: "pt", dir: "ltr", name: "Português" },
  { id: "tr", dir: "ltr", name: "Türkçe" },
  { id: "zh", dir: "ltr", name: "简体中文" },
  { id: "ja", dir: "ltr", name: "日本語" },
  { id: "ru", dir: "ltr", name: "Русский" },
];

/** هل اللغة RTL؟ — مصدر وحيد للتحقق بدل مقارنات متفرقة. */
export const isRtlLanguage = (id) => LANGUAGES.find((l) => l.id === id)?.dir === "rtl";

export const NOTIFICATION_KEYS = ["likes", "comments", "followers", "newArticles", "newIdeas", "emailNotifications"];

export const READING_KEYS = ["focusMode", "hideLikeCounts", "hideNotificationsWhileReading", "minimalUI", "autoReadingMode"];

export const READING_GOALS = [15, 30, 60];

export const CREATOR_KEYS = ["allowComments", "showAnalytics", "publicAuthorProfile", "allowMessages"];
