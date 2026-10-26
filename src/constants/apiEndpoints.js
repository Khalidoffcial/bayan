// export const API_BASE_URL = 'http://localhost:4000';
export const API_BASE_URL = 'https://bayan-production-0201.up.railway.app';

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth`,
  SIGNIN: `${API_BASE_URL}/signin`,
  SIGNUP: `${API_BASE_URL}/signup`,
  AUTH_GOOGLE: `${API_BASE_URL}/authGoogle`,
  GET_USER: `${API_BASE_URL}/getuser`,
  EDIT_PROFILE: `${API_BASE_URL}/editProfile`,
  FOLLOW_USER: `${API_BASE_URL}/followingUser`,
  UNFOLLOW_USER: `${API_BASE_URL}/unfollowingUser`,
  SAVE_POSTS: `${API_BASE_URL}/savePosts`,
  SAVE_ARTICLE_NOVELS: `${API_BASE_URL}/saveArticle_novels`,
  EDIT_PROFILE_PHOTO: `${API_BASE_URL}/edit_profile_photo`,
  EDIT_BIO: `${API_BASE_URL}/edit_bio`,
  SETTINGS: `${API_BASE_URL}/settings`,
};
