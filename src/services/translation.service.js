import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * ContentTranslation service — ترجمة المحتوى المنشور عند طلب المستخدم.
 * لا تُعدّل المحتوى الأصلي إطلاقًا — النتيجة تُعرض فقط تحت الأصل.
 */

export const translateContent = async ({ contentId, contentType, targetLang, text }) => {
  try {
    const response = await api.post(`${API_ENDPOINTS.TRANSLATE}`, {
      contentId,
      contentType,
      targetLang,
      text,
    });
    const data = response?.data;
    if (data?.status === "ok") {
      return { ok: true, translatedText: data.translatedText, sourceLang: data.sourceLang, cached: data.cached };
    }
    return { ok: false, error: data?.error || "UNKNOWN", message: data?.message };
  } catch (error) {
    const data = error?.response?.data;
    return {
      ok: false,
      error: data?.error || "NETWORK",
      message: data?.message || error.message,
      retryAfterMs: data?.retryAfterMs,
    };
  }
};
