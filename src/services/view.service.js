import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

/**
 * View counter — تسجيل مشاهدة عبر الخادم.
 * الخادم يقرر إن كانت المشاهدة جديدة أو مكررة، ويعيد العدد الفعلي.
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
