import { useMemo, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { getTranslation, getLocaleCompleteness } from "./translations";
import { isRtlLanguage } from "../constants/settingsConfig";

/**
 * useTranslation — الوصول الموحد للغة والاتجاه والنصوص المترجمة من أي Component.
 * يقرأ اللغة من SettingsContext الحالي (مصدر الحقيقة الوحيد).
 *
 * مثال:
 *   const { t, language, dir } = useTranslation();
 *   t("nav.posts") // "منشورات" أو "Posts"
 */
export const useTranslation = () => {
  const { language } = useSettings();
  // الاتجاه يُحدد من LANGUAGES في settingsConfig — أي لغة rtl جديدة تعمل تلقائيًا
  const dir = isRtlLanguage(language) ? "rtl" : "ltr";

  const t = useCallback(
    (key, params, fallback) => getTranslation(language, key, params, fallback),
    [language]
  );

  return useMemo(() => ({ t, language, dir }), [t, language, dir]);
};

export default useTranslation;
