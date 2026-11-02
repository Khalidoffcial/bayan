/**
 * نظام الترجمة المركزي لـ Bayan Space.
 * المصدر الوحيد للحقيقة: ملفات locales/ — كل لغة في ملف مستقل.
 * المفاتيح بالإنجليزية (snake_case) — en.js هو المرجع،
 * واختبار key-parity (src/i18n/i18n.test.js) يتحقق من تطابق المفاتيح.
 *
 * لإضافة لغة جديدة:
 *   1. أنشئ locales/xx.js بنفس مفاتيح en.js.
 *   2. أضفها هنا (import + TRANSLATIONS).
 *   3. أضفها إلى LANGUAGES في constants/settingsConfig.js.
 *   4. أضفها إلى whitelist اللغات في backend (mainServer.js → sanitizeSettings).
 */
import en from "./locales/en";
import ar from "./locales/ar";
import fr from "./locales/fr";
import es from "./locales/es";
import de from "./locales/de";
import pt from "./locales/pt";
import tr from "./locales/tr";
import zh from "./locales/zh";
import ja from "./locales/ja";
import ru from "./locales/ru";

export const TRANSLATIONS = {
  en,
  ar,
  fr,
  es,
  de,
  pt,
  tr,
  zh,
  ja,
  ru,
};

/**
 * نسبة اكتمال ترجمة واجهة أي لغة مقابل en.js (مرجع المفاتيح).
 * تُستخدم داخليًا لعرض حالة "ترجمة غير مكتملة" في الإعدادات —
 * لا تُعرض لغة كمدعومة بالكامل إلا إذا كان اكتمالها 100%.
 */
export const getLocaleCompleteness = (lang) => {
  const reference = Object.keys(en);
  if (!TRANSLATIONS[lang]) return 0;
  const covered = reference.filter((key) => TRANSLATIONS[lang][key] != null);
  return covered.length / reference.length;
};

export const getTranslation = (lang, key, params, fallback) => {
  const table = TRANSLATIONS[lang] || TRANSLATIONS.en;
  // التوافق مع الاستدعاءات القديمة t(key, fallback) — السلسلة تعتبر fallback
  if (typeof params === "string") {
    fallback = params;
    params = undefined;
  }
  let value = table[key] ?? TRANSLATIONS.en[key];
  if (value == null) value = fallback ?? key;
  if (params && typeof value === "string") {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
  }
  return value;
};

export default TRANSLATIONS;
