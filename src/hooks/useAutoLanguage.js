/**
 * useAutoLanguage — تم استبداله بالكامل بنظام مركزي أحدث:
 *
 *   src/i18n/geoLanguage.js        → منطق تحديد اللغة (GeoIP → المتصفح → en)
 *   src/contexts/SettingsContext   → يستدعيه مرة واحدة عند أول زيارة بلا اختيار محفوظ،
 *                                    ويطبّق النتيجة عبر React state (بلا reload).
 *
 * الاحتفاظ بـ setManualLanguage هنا للتوافق مع أي استدعاء قديم، لكن
 * المسار الرسمي للاختيار اليدوي هو SettingsContext.setLanguage (LanguageSwitcher).
 */
import { LANGUAGES } from "../constants/settingsConfig";

const LS_KEY = "language";

export const isSupportedLanguage = (lang) => LANGUAGES.some((l) => l.id === lang);

/** يُستدعى من Language Switcher عند الاختيار اليدوي — يحفظ الاختيار ولا يُستبدل لاحقًا */
export function setManualLanguage(lang) {
  if (!isSupportedLanguage(lang)) return;
  try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* ignore */ }
}
