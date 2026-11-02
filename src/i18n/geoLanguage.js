import { LANGUAGES } from "../constants/settingsConfig";

/**
 * detectUserLanguage — تحديد اللغة تلقائيًا في أول زيارة (بدون GPS ولا إذن موقع).
 *
 * الأولوية:
 *  1. اختيار يدوي محفوظ (localStorage.language) — لا يُتجاوز أبدًا.
 *  2. GeoIP خفيف (ipapi.co/json — طلب واحد بلا مفاتيح، timeout 1.2s) → لغة البلد.
 *  3. navigator.languages / navigator.language → أول لغة مدعومة.
 *  4. "en" fallback.
 *
 * لا تحجب الرسم أبدًا: تُنفَّذ قبل أول تسييق لـ SettingsProvider بمهلة قصيرة،
 * وفشل الخدمة يعني الانتقال فورًا للخطوة التالية.
 * النتيجة تُكتب في localStorage.language قبل قراءتها من السياق.
 */

const SUPPORTED = new Set(LANGUAGES.map((l) => l.id));

/** خريطة بلد → لغة (كل اللغات المدعومة؛ أي لغة جديدة تُضاف مع مفتاحها) */
const COUNTRY_TO_LANG = {
  // العربية
  EG: "ar", SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar",
  JO: "ar", LB: "ar", SY: "ar", IQ: "ar", YE: "ar", PS: "ar", LY: "ar",
  SD: "ar", DZ: "ar", MA: "ar", TN: "ar", MR: "ar", SO: "ar", DJ: "ar", KM: "ar",
  // الفرنسية
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", CH: "fr", SN: "fr", CI: "fr",
  ML: "fr", BF: "fr", NE: "fr", TG: "fr", BJ: "fr", GA: "fr", CG: "fr",
  CD: "fr", CM: "fr", TD: "fr", CF: "fr", GN: "fr", MG: "fr",
  // الإسبانية
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  UY: "es", PY: "es", BO: "es", EC: "es", GT: "es", HN: "es", SV: "es",
  NI: "es", CR: "es", PA: "es", CU: "es", DO: "es", PR: "es", GQ: "es",
  // الألمانية
  DE: "de", AT: "de", LI: "de",
  // البرتغالية
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // التركية
  TR: "tr", AZ: "tr",
  // الصينية
  CN: "zh", TW: "zh", HK: "zh", MO: "zh", SG: "zh",
  // اليابانية
  JP: "ja",
  // الروسية
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", UZ: "ru", TJ: "ru", TM: "ru", AM: "ru",
};

/** استخراج أول لغة مدعومة من سلسلة BCP47 مثل "ar-EG" أو "pt-BR" */
const matchFromTag = (tag) => {
  if (!tag) return null;
  const base = String(tag).toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.has(base) ? base : null;
};

/** لغة المتصفح — تُستخدم أيضًا كـ fallback نهائي قبل "en" */
export const browserLanguage = () => {
  const list = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of list) {
    const m = matchFromTag(tag);
    if (m) return m;
  }
  return null;
};

/** GeoIP خفيف — طلب واحد، بلا مفاتيح، بمهلة قصيرة؛ أي فشل يُتجاهل بصمت */
const geoCountry = async () => {
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 1200) : null;
    const res = await fetch("https://ipapi.co/json/", {
      signal: ctrl ? ctrl.signal : undefined,
      cache: "no-store",
    });
    if (timer) clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.country_code ? String(data.country_code).toUpperCase() : null;
  } catch (e) {
    return null; // فشل الشبكة/الخدمة → نصغير تلقائيًا للمتصفح
  }
};

/**
 * resolveLanguage — يرجع { language, source } ويكتب النتيجة في localStorage
 * إذا كان هناك قرار جديد. الاستدعاء الاختياري علىSet يسمح للسياق بمزامنة الحالة.
 */
export const resolveLanguage = async ({ onResolved } = {}) => {
  // 1) اختيار يدوي سابق؟ مطلقًا لا نستبدله.
  let saved = null;
  try { saved = localStorage.getItem("language"); } catch (e) { /* ignore */ }
  if (saved && SUPPORTED.has(saved)) {
    return { language: saved, source: "saved" };
  }

  // 2) GeoIP → لغة البلد (بلا إذن موقع، بمهلة 1.2s)
  const country = await geoCountry();
  if (country && COUNTRY_TO_LANG[country]) {
    const lang = COUNTRY_TO_LANG[country];
    try { localStorage.setItem("language", lang); } catch (e) { /* ignore */ }
    if (onResolved) onResolved(lang);
    return { language: lang, source: "geo" };
  }

  // 3) لغة المتصفح
  const fromBrowser = browserLanguage();
  if (fromBrowser) {
    try { localStorage.setItem("language", fromBrowser); } catch (e) { /* ignore */ }
    if (onResolved) onResolved(fromBrowser);
    return { language: fromBrowser, source: "browser" };
  }

  // 4) fallback: الإنجليزية
  try { localStorage.setItem("language", "en"); } catch (e) { /* ignore */ }
  if (onResolved) onResolved("en");
  return { language: "en", source: "fallback" };
};

export default resolveLanguage;
