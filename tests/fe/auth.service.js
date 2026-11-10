import axios from "axios";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../../services/firebaseAuth.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";
import cookie from "../../../utils/cookies";
export const verifyAuthToken = async (token) => {
  const authToken = token || cookie("get") || localStorage.getItem("token") || localStorage.getItem("Token");
  if (!authToken) throw new Error("No token found");
  const response = await axios.post(
    API_ENDPOINTS.AUTH,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};
export const signInWithCredentials = async (identifierUser, password) => {
  const response = await axios.post(
    API_ENDPOINTS.SIGNIN,
    { identifierUser, password },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};
export const signUpUser = async (data) => {
  const response = await axios.post(
    API_ENDPOINTS.SIGNUP,
    data,
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};
export const getGoogleFirebaseUser = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  // SECURITY (P2): expose the Firebase ID token alongside the profile so the
  // backend can verify Google sign-in server-side (anti-account-takeover).
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
};
export const authenticateGoogleUserApi = async (data) => {
  const response = await axios.post(
    API_ENDPOINTS.AUTH_GOOGLE,
    data,
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};
export const signInWithGoogle = async () => {
  const { user, idToken } = await getGoogleFirebaseUser();
  const data = {
    // SECURITY (P2): the verified idToken is authoritative. email/uid/name
    // are sent for backward compatibility only and are IGNORED by the
    // server, which reads them from the verified token claims.
    idToken,
    email: user.email,
    uid: user.uid,
    name: user.displayName,
  };
  const apiData = await authenticateGoogleUserApi(data);
  return { firebaseUser: user, apiData, status: 200 };
};
