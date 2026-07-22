import React, { useState, useEffect } from "react";
import "./signup.css";
import axios from "axios";
import nextIcon from "../icons/next.png";
import earth from "../image/image0.svg";
import { Link, useNavigate } from "react-router-dom";
import cookie from "../databases/cookies_DAO.js";

import { auth, googleProvider } from "./firebase.js";
import { signInWithPopup } from "firebase/auth";

const API = process.env.SERVER_API;

function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email_google, set_email] = useState("");
  const [uid_google, set_uid] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);

  // ==============================
  // AUTH CHECK (JWT)
  // ==============================
  useEffect(() => {
    const token = cookie("get") || localStorage.getItem("Token");
    if (!token) return;

    axios
      .post(
        `${API}/auth`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((res) => {
        if (res.data?.userData) {
          localStorage.setItem("me", JSON.stringify(res.data.userData));
          navigate("/");
        }
      })
      .catch(() => {});
  }, [navigate]);

  // ==============================
  // HANDLERS
  // ==============================
  const handleSignup = () => {
    const uppercaseRegex = /[A-Z]/;

    if (!uppercaseRegex.test(password)) {
      setShowPasswordError(true);
      return;
    }

    if (password !== confirmPassword) {
      setShowConfirmError(true);
      return;
    }

    setShowPasswordError(false);
    setShowConfirmError(false);

    const finalUsername = username.startsWith("@")
      ? username
      : "@" + username;

    const data = {
      fullName,
      username: finalUsername,
      password,
      email: email_google,
      uid: uid_google,
    };

    axios
      .post(`${API}/signup`, data, {
        headers: { "Content-Type": "application/json" },
      })
      .then((response) => {
        const token = response.data.token;

        if (rememberMe) {
          cookie(token);
        } else {
          localStorage.setItem("Token", token);
        }

        localStorage.setItem("me", JSON.stringify(response.data.userData));

        navigate("/");
      })
      .catch((error) => {
        console.error("Signup Error:", error);
      });
  };

  // ==============================
  // GOOGLE LOGIN (FIXED)
  // ==============================
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const email = result.user.email;
      const uid = result.user.uid;

      set_email(email)
      set_uid(uid)

      console.log(email)
      console.log(uid)


    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  // ==============================
  // UI
  // ==============================
  return (
    <div className="log-page">
      <img className="background" src={earth} alt="bg" />

      <div className="signup-box">
        <h2>Bayan</h2>
        <h6>Sign up</h6>

        <div className="user-box">
          <input
            type="text"
            placeholder="Full Name"
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          {showPasswordError && (
            <p className="error">
              Password must contain at least 1 uppercase letter
            </p>
          )}

          <input
            type="password"
            placeholder="Confirm Password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {showConfirmError && (
            <p className="error">Passwords do not match</p>
          )}

          {/* Google */}
          <button
            type="button"
            className="login_with_google_btn"
            onClick={handleGoogleLogin}
          >
            Sign in with Google
          </button>

          {/* Remember Me */}
          <div className="checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="checkboxInput"
            />
            <h4 className="checkboxLabel">Remember Me</h4>
          </div>
        </div>

        <div className="sign">
          <Link to="/Signin" className="signin">
            Sign in
          </Link>

          <button className="signup" onClick={handleSignup}>
            <h1>Sign up</h1>
            <img src={nextIcon} alt="next" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;