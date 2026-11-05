// REACT_APP_API_BASE_URL decides the backend:
//   - set in .env.development / .env.local  → that value (localhost:4000 for dev)
//   - unset (Vercel/production build)       → the Railway production URL
// A dev bundle can therefore never ship pointing at production, and a
// production build never points at localhost (the fallback is prod).
const PROD_API_BASE_URL = 'https://bayan-production-0201.up.railway.app';
const DEV_API_BASE_URL = 'http://localhost:4000';

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? DEV_API_BASE_URL : PROD_API_BASE_URL);

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
  GET_COMMENTS: `${API_BASE_URL}/getComments`,
  GET_REPLIES: `${API_BASE_URL}/getReplies`,
  GET_POST_BY_ID: `${API_BASE_URL}/getPostById`,
  MEDIA_UPLOAD_SIGNATURE: `${API_BASE_URL}/media/upload-signature`,
  MEDIA_DISCARD: `${API_BASE_URL}/media/discard`,
  EDIT_POST: `${API_BASE_URL}/editPost`,
  DELETE_POST: `${API_BASE_URL}/deletePost`,
  TRANSLATE: `${API_BASE_URL}/translate`,
  VIEW: `${API_BASE_URL}/view`,
};
