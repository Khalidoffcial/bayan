import React from "react";
import { Link } from "react-router-dom";
import useAuthForm from "../hooks/useAuthForm";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthShell from "./AuthShell";
import { useTranslation } from "../../../i18n/useTranslation";

export const LoginForm = () => {
  const { t } = useTranslation();
  const {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    errorMsg,
    loading,
    handleLogin,
    handleGoogleAuth,
  } = useAuthForm("login");

  return (
    <AuthShell titleKey="auth.login.title" subtitleKey="auth.login.subtitle">
      <GoogleAuthButton onClick={handleGoogleAuth} disabled={loading} />

      <div className="auth-divider">{t("auth.or")}</div>

      <div className="auth-field">
        <label htmlFor="login-username">{t("auth.username")}</label>
        <input
          id="login-username"
          type="text"
          placeholder={t("auth.usernamePlaceholder")}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">{t("auth.password")}</label>
        <input
          id="login-password"
          type="password"
          placeholder={t("auth.passwordPlaceholder")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {errorMsg && (
        <div className="auth-alert" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="auth-remember">
        <input
          type="checkbox"
          id="remember-me-login"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <label htmlFor="remember-me-login">{t("auth.rememberMe")}</label>
      </div>

      <button type="button" className="auth-submit" onClick={handleLogin} disabled={loading}>
        {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
        <span>{loading ? t("auth.signingIn") : t("auth.loginCta")}</span>
      </button>

      <p className="auth-switch">
        {t("auth.noAccount")}{" "}
        <Link to="/signup">{t("auth.signupLink")}</Link>
      </p>
    </AuthShell>
  );
};

export default LoginForm;
