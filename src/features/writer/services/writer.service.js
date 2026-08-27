import axios from "axios";
import { uploadImages } from "../../../services/storage.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";

export const saveArticleOrNovel = async (payload) => {
  const token = cookie("get") || localStorage.getItem("token");
  const headers = token ? { Authorization: "Bearer " + token } : {};

  const response = await axios.post(
    API_ENDPOINTS.SAVE_ARTICLE_NOVELS,
    payload,
    { headers }
  );
  return response.data;
};

export const saveIdeaPost = async (payload) => {
  const token = cookie("get") || localStorage.getItem("token");
  const headers = token ? { Authorization: "Bearer " + token } : {};

  const response = await axios.post(
    API_ENDPOINTS.SAVE_POSTS,
    payload,
    { headers }
  );
  return response.data.message;
};

export const uploadWriterImages = async (images) => {
  return await uploadImages(images);
};


