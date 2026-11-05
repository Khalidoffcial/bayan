/**
 * trivia.service.js (frontend) — data layer for Knowledge Challenges.
 * All requests go through the backend proxy (`api` attaches the Bearer token);
 * the answer key never reaches the client — grading happens server-side.
 */
import { api } from "../../../services/api.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

const TRIVIA = `${API_BASE_URL}/trivia`;

export const fetchCategories = async () => {
  try {
    const r = await api.get(`${TRIVIA}/categories`);
    const body = r?.data;
    if (body?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, categories: body.categories || [], cached: Boolean(body.cached) };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const createSession = async ({ amount, category, difficulty, type }) => {
  try {
    const r = await api.post(`${TRIVIA}/session`, { amount, category, difficulty, type });
    const body = r?.data;
    if (body?.status !== "ok") return { ok: false, error: body?.message || "FAILED" };
    return { ok: true, sessionId: body.sessionId, questions: body.questions, config: body.config };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK", code: err?.response?.data?.code };
  }
};

/** grade one answer server-side (the key never lives in the client). */
export const checkAnswer = async ({ sessionId, question, answer }) => {
  try {
    const r = await api.post(`${TRIVIA}/answer`, { sessionId, question, answer });
    const body = r?.data;
    if (body?.status !== "ok") return { ok: false, error: body?.message || "FAILED" };
    return { ok: true, isCorrect: body.isCorrect, correctAnswer: body.correct };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const saveResult = async ({ sessionId, config, answers, timeSpentSec }) => {
  try {
    const r = await api.post(`${TRIVIA}/save-result`, { sessionId, config, answers, timeSpentSec });
    const body = r?.data;
    if (body?.status !== "ok") return { ok: false, error: body?.message || "FAILED" };
    return { ok: true, record: body.record };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};

export const fetchHistory = async () => {
  try {
    const r = await api.get(`${TRIVIA}/history`);
    const body = r?.data;
    if (body?.status !== "ok") return { ok: false, error: "FAILED" };
    return { ok: true, history: body.history || [] };
  } catch (err) {
    return { ok: false, error: err?.response?.data?.message || err?.message || "NETWORK" };
  }
};
