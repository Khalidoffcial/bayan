export const API_BASE_URL = process.env.REACT_APP_SERVER_API || 'https://bayan-production-d773.up.railway.app';

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
  SETTINGS: `${API_BASE_URL}/settings`,
};
