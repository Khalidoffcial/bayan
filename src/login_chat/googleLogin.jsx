import React from "react";
import { auth, googleProvider } from "./firebase.js";
import { signInWithPopup } from "firebase/auth";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function GoogleLoginButton() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
        console.log("AUTH:", auth);
        console.log("GOOGLE PROVIDER:", googleProvider);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const googleUser = {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      };

      const res = await axios.post(`bayan-production-036e.up.railway.app/authGoogle`, googleUser, {
        headers: { "Content-Type": "application/json" },
      });

      localStorage.setItem("me", JSON.stringify(res.data.userData));
      navigate("/");
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  return (
    <button
      type="button"
      className="login_with_google_btn"
      onClick={handleGoogleLogin}
    >
      Sign in with Google
    </button>
  );
}
