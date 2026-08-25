import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  verifyAuthToken,
  signInWithCredentials,
  signUpUser,
  signInWithGoogle,
} from "../services/auth.service";
import cookie from "../../../utils/cookies";

export const useAuthForm = (type = "login") => {
  const navigate = useNavigate();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailGoogle, setEmailGoogle] = useState("");
  const [uidGoogle, setUidGoogle] = useState("");

  // Validation errors
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-auth check if already logged in
  useEffect(() => {
    verifyAuthToken()
      .then((data) => {
        if (data?.userData) {
          localStorage.setItem("me", JSON.stringify(data.userData));
          navigate("/");
        }
      })
      .catch(() => { });
  }, [navigate]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await signInWithCredentials(username, password);
      const accessToken = data.accessToken;
      localStorage.setItem("me", JSON.stringify(data.userData));

      if (rememberMe) {
        cookie(accessToken);
      } else {
        localStorage.setItem("token", accessToken);
      }

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, password, rememberMe, navigate]);

  const handleSignup = useCallback(async () => {
    const uppercaseRegex = /[A-Z]/;

    if (!uppercaseRegex.test(password)) {
      setShowPasswordError(true);
      return;
    }
    setShowPasswordError(false);

    if (password !== confirmPassword) {
      setShowConfirmError(true);
      return;
    }
    setShowConfirmError(false);

    const finalUsername = username.startsWith("@") ? username : "@" + username;

    const payload = {
      fullName,
      username: finalUsername,
      password,
      email: emailGoogle,
      uid: uidGoogle,
    };

    setLoading(true);
    setErrorMsg("");
    try {
      const response = await signUpUser(payload);
      const token = response.token;

      if (rememberMe) {
        cookie(token);
      } else {
        localStorage.setItem("Token", token);
      }

      localStorage.setItem("me", JSON.stringify(response.userData));
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      setErrorMsg("Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fullName, username, password, confirmPassword, emailGoogle, uidGoogle, rememberMe, navigate]);

  const handleGoogleAuth = useCallback(async () => {
    setLoading(true);
    try {
      const { firebaseUser, apiData, status } = await signInWithGoogle();
      if (type === "signup") {
        setEmailGoogle(firebaseUser.email);
        setUidGoogle(firebaseUser.uid);
      } else if (apiData && status === 200) {
        const accessToken = apiData.accessToken;
        localStorage.setItem("me", JSON.stringify(apiData.userData));

        if (rememberMe) {
          cookie(accessToken);
        } else {
          localStorage.setItem("token", accessToken);
        }
        navigate("/");
      }
    } catch (err) {
      console.error("Google Auth error:", err);
    } finally {
      setLoading(false);
    }
  }, [type, rememberMe, navigate]);

  return {
    fullName,
    setFullName,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    showPasswordError,
    showConfirmError,
    errorMsg,
    loading,
    handleLogin,
    handleSignup,
    handleGoogleAuth,
  };
};

export default useAuthForm;
