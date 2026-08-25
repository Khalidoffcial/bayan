import axios from "axios";
import { ref as storageRef, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "../../../services/firebaseStorage.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";

export const fetchUserProfile = async (idOtherUser) => {
  const response = await axios.post(
    `${API_BASE_URL}/getuser`,
    { idOtherUser },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const updateUserProfileField = async (value, field) => {
  const response = await axios.post(
    `${API_BASE_URL}/editProfile`,
    { Updatable: value, status: field },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const followUserApi = async (IdUser, idFollowedUser) => {
  const response = await axios.post(
    `${API_BASE_URL}/followingUser`,
    { IdUser, idFollowedUser },
    { headers: { Authorization: "Bearer " + cookie("get") } }
  );
  return response.data;
};

export const unfollowUserApi = async (IdUser, idFollowedUser) => {
  const response = await axios.post(
    `${API_BASE_URL}/unfollowingUser`,
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
  const imageRef = storageRef(storage, `ImagesProfile/image${userId}.jpg`);
  await uploadBytes(imageRef, blob);
  return await getDownloadURL(imageRef);
};
