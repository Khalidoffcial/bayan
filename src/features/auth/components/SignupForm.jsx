import React from "react";
import { Link } from "react-router-dom";
import useAuthForm from "../hooks/useAuthForm";
import GoogleAuthButton from "./GoogleAuthButton";
import nextIcon from "../../../assets/icons/next.png";
import earth from "../../../assets/images/image0.svg";
import "../styles/signup.css";

export const SignupForm = () => {
  const {
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
    loading,
    handleSignup,
    handleGoogleAuth,
  } = useAuthForm("signup");

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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {showConfirmError && (
            <p className="error">Passwords do not match</p>
          )}

          <GoogleAuthButton onClick={handleGoogleAuth} disabled={loading} />

          <div className="checkbox">
            <input
              type="checkbox"
              id="remember-me-signup"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="checkboxInput"
            />
            <label htmlFor="remember-me-signup" className="checkboxLabel">
              Remember Me
            </label>
          </div>
        </div>

        <div className="sign">
          <Link to="/signin" className="signin">
            Sign in
          </Link>

          <button
            className="signup"
            onClick={handleSignup}
            disabled={loading}
          >
            <h1>{loading ? "Signing up..." : "Sign up"}</h1>
            <img src={nextIcon} alt="next" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
