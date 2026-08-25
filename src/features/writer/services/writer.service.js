import axios from "axios";
import { uploadImages } from "../../../services/storage.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";

export const saveArticleOrNovel = async (payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/saveArticle_novels`,
    payload,
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const saveIdeaPost = async (payload) => {
  const response = await axios.post(
    `${API_BASE_URL}/saveIdeas`,
    payload,
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const uploadWriterImages = async (images) => {
  return await uploadImages(images);
};
