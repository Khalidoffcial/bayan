import axios from "axios";
import cookie from "../utils/cookies";
import { API_BASE_URL } from "../constants/apiEndpoints";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = cookie("get") || localStorage.getItem("token") || localStorage.getItem("Token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
