import axios from "axios";
import { ref as storageRef, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "../../../services/firebaseStorage.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";

const {
  GET_USER,
  EDIT_PROFILE,
  FOLLOW_USER,
  UNFOLLOW_USER
} = API_ENDPOINTS;

export const fetchUserProfile = async (idOtherUser) => {
  const response = await axios.post(
    `${GET_USER}`,
    { idOtherUser },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const updateUserProfileField = async (value, field) => {
  const response = await axios.post(
    `${EDIT_PROFILE}`,
    { Updatable: value, status: field },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const followUserApi = async (IdUser, idFollowedUser) => {
  const response = await axios.post(
    `${FOLLOW_USER}`,
    { IdUser, idFollowedUser },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const unfollowUserApi = async (IdUser, idFollowedUser) => {
  const response = await axios.post(
    `${UNFOLLOW_USER}`,
    { IdUser, idFollowedUser },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

// Aliases for backward compatibility
export const getUser = async (idOtherUser) => {
  const data = await fetchUserProfile(idOtherUser);
  return data?.userData;
};

export const updateProfile = async (value, status) => {
  const data = await updateUserProfileField(value, status);
  return data?.userData;
};

export const followUser = async (IdUser, idFollowedUser) => {
  const data = await followUserApi(IdUser, idFollowedUser);
  return data?.userData;
};

export const unfollowUser = async (IdUser, idFollowedUser) => {
  const data = await unfollowUserApi(IdUser, idFollowedUser);
  return data?.userData;
};

export const uploadProfileImageBlob = async (blob, userId) => {
if (!blob || !userId) {
    throw new Error("Image and user ID are required");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary environment variables are missing");
  }

  const formData = new FormData();
  formData.append("file", blob, "profile.jpg");
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "bayan/profile");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Cloudinary image upload failed"
    );
  }

  return result.secure_url;
};
