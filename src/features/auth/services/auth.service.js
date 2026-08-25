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

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const data = {
    email: user.email,
    uid: user.uid,
    name: user.displayName,
  };

  const response = await axios.post(
    API_ENDPOINTS.AUTH_GOOGLE,
    data,
    { headers: { "Content-Type": "application/json" } }
  );

  return { firebaseUser: user, apiData: response.data, status: response.status };
};
