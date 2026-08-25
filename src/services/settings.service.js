import { api } from "./api.service";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

export const fetchUserSettings = async () => {
  const response = await api.get(API_ENDPOINTS.SETTINGS);
  return response?.data;
};

export const updateUserSettings = async (settingsData) => {
  const response = await api.put(API_ENDPOINTS.SETTINGS, settingsData);
  return response?.data;
};

