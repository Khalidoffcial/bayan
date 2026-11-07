import axios from "axios";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";

// Firebase Storage (~120KB) is only needed when images are actually uploaded
// — loaded on demand so it stays out of the initial bundle.
const uploadImagesLazy = async (images) => {
  const { uploadImages } = await import("../../../services/storage.service");
  return uploadImages(images);
};

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
  return await uploadImagesLazy(images);
};


