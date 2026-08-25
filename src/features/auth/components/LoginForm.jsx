import React from "react";
import { Link } from "react-router-dom";
import useAuthForm from "../hooks/useAuthForm";
import GoogleAuthButton from "./GoogleAuthButton";
import nextIcon from "../../../assets/icons/next.png";
import earth from "../../../assets/images/image0.svg";
import "../styles/signup.css";

export const LoginForm = () => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    loading,
    handleLogin,
    handleGoogleAuth,
  } = useAuthForm("login");

  return (
    <div className="log-page">
      <img className="background" src={earth} alt="background" />

      <div className="signup-box">
        <h2>Bayan</h2>
        <h6>Login</h6>

        <div className="user-box">
          <input
            type="text"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="user-box">
          <input
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <GoogleAuthButton onClick={handleGoogleAuth} disabled={loading} />

        <div className="checkbox">
          <input
            type="checkbox"
            id="remember-me-login"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="remember-me-login" className="checkboxLabel">
            Remember Me
          </label>
        </div>

        <div className="sign">
          <Link to="/signup" className="signin">
            I don’t have an account
          </Link>

          <button
            className="signup"
            onClick={handleLogin}
            disabled={loading}
          >
            <h1>{loading ? "Signing in..." : "Sign in"}</h1>
            <img src={nextIcon} alt="next" className="img_next" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
