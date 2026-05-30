import React, { useState, useEffect } from "react";
import "./signup.css";
import axios from "axios";
import nextIcon from "../icons/next.png";
import earth from "../image/image0.svg";
import { Link, useNavigate } from "react-router-dom";
import cookie from "../databases/cookies_DAO.js";

import { auth, googleProvider } from "./firebase.js";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";

function Signup() {
  const navigate = useNavigate();

  // States
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);

  // -------------------------
  // Auth check (JWT)
  // -------------------------
  useEffect(() => {
    const token = cookie("get");

    if (!token) return;

    axios
      .post(
        "https://bayan.railway.internal:4000/auth",
        {},
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      )
      .then((res) => {
        if (res.status === 200 && res.data.userData) {
          localStorage.setItem("me", JSON.stringify(res.data.userData));
          navigate("/");
        }
      })
      .catch(() => {});
  }, [navigate]);

  // -------------------------
  // Google redirect result handler
  // -------------------------
  useEffect(() => {
    const handleGoogleResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          const user = {
            email: result.user.email,
            uid: result.user.uid,
          };

          setGoogleUser(user);
          localStorage.setItem("googleUser", JSON.stringify(user));
        }
      } catch (err) {
        console.error("Google redirect error:", err);
      }
    };

    handleGoogleResult();
  }, []);

  // -------------------------
  // Handlers
  // -------------------------
  const handleFullName = (e) => setFullName(e.target.value);
  const handleUsername = (e) => setUsername(e.target.value);
  const handlePassword = (e) => setPassword(e.target.value);
  const handleConfirmPassword = (e) => setConfirmPassword(e.target.value);
  const handleRememberMe = (e) => setRememberMe(e.target.checked);

  // -------------------------
  // Signup
  // -------------------------
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

    const googleData = JSON.parse(localStorage.getItem("googleUser"));

    const data = {
      fullName,
      username: finalUsername,
      password,
      email: googleData?.email || null,
      uid: googleData?.uid || null,
    };

    axios
      .post("https://bayan.railway.internal:4000/signup", data, {
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

  // -------------------------
  // Google login (Redirect only)
  // -------------------------
  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  // -------------------------
  // UI
  // -------------------------
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
            onChange={handleFullName}
            autofill="false"
          />

          <input
            type="text"
            placeholder="Username"
            onChange={handleUsername}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={handlePassword}
          />

          {showPasswordError && (
            <p className="error">
              Password must contain at least 1 uppercase letter
            </p>
          )}

          <input
            type="password"
            placeholder="Confirm Password"
            onChange={handleConfirmPassword}
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
              onChange={handleRememberMe}
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