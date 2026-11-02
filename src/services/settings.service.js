import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * تسجيل مشاهدة محتوى. الخادم يقرر العدد — الواجهة تعرض الاستجابة فقط.
 * مكررة → counted=false (لا نعرض رقمًا متزايدًا وهميًا).
 */
export const registerView = async ({ contentId, contentType }) => {
  try {
    const res = await api.post(API_ENDPOINTS.VIEW, { contentId, contentType });
    if (res?.data?.status === "ok") {
      return { ok: true, views: res.data.views, counted: res.data.counted };
    }
    return { ok: false, error: res?.data?.error || "UNKNOWN" };
  } catch (error) {
    return { ok: false, error: error?.response?.data?.error || "NETWORK" };
  }
};

export const fetchUserSettings = async () => {
  const response = await api.get(API_ENDPOINTS.SETTINGS);
  return response?.data;
};

export const updateUserSettings = async (settingsData) => {
  const response = await api.put(API_ENDPOINTS.SETTINGS, settingsData);
  return response?.data;
};

