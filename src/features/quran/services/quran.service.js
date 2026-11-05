/**
 * quran.service.js (frontend) — AlQuran Cloud via the backend proxy.
 * النص القرآني يصل كما هو من المصدر الرسمي (quran-uthmani) — لا تعديل.
 * كل البيانات العامة (بلا توكن)؛ progress/bookmarks فقط تتطلب الهوية.
 */
import { api } from "../../../services/api.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

const QURAN = `${API_BASE_URL}/quran`;

export const fetchSurahs = async () => {
  try {
    const r = await api.get(`${QURAN}/surahs`);
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, surahs: b.surahs || [], cached: Boolean(b.cached) };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const fetchTranslations = async () => {
  try {
    const r = await api.get(`${QURAN}/translations`);
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, translations: b.translations || [] };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const fetchReciters = async () => {
  try {
    const r = await api.get(`${QURAN}/reciters`);
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, reciters: b.reciters || [] };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

/** سورة كاملة: نص عثماني + ترجمة اختيارية + صوت قارئ اختياري */
export const fetchSurah = async (number, { translation, reciter, bitrate } = {}) => {
  try {
    const params = new URLSearchParams();
    if (translation) params.set("translation", translation);
    if (reciter) params.set("reciter", reciter);
    if (bitrate) params.set("bitrate", String(bitrate));
    const r = await api.get(`${QURAN}/surah/${number}?${params}`);
    const b = r?.data;
    if (b?.status !== "ok" || !b.surah) return { ok: false, error: b?.message || "FAILED" };
    return { ok: true, surah: b.surah };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const fetchProgress = async () => {
  try {
    const r = await api.get(`${QURAN}/progress`);
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, progress: b.progress };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const saveProgress = async (surah, ayah) => {
  try {
    const r = await api.put(`${QURAN}/progress`, { surah, ayah });
    return r?.data?.status === "ok" ? { ok: true } : { ok: false, error: "FAILED" };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const toggleBookmark = async (surah, ayah, note = "") => {
  try {
    const r = await api.put(`${QURAN}/bookmarks`, { surah, ayah, note });
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, bookmarked: b.bookmarked };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const fetchBookmarks = async () => {
  try {
    const r = await api.get(`${QURAN}/bookmarks`);
    const b = r?.data;
    if (b?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, bookmarks: b.bookmarks || [] };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};
