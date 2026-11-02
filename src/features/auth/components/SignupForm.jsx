import React from "react";
import { Link } from "react-router-dom";
import useAuthForm from "../hooks/useAuthForm";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthShell from "./AuthShell";
import { useTranslation } from "../../../i18n/useTranslation";

export const SignupForm = () => {
  const { t } = useTranslation();
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
    errorMsg,
    loading,
    handleSignup,
    handleGoogleAuth,
  } = useAuthForm("signup");

  return (
    <AuthShell titleKey="auth.signup.title" subtitleKey="auth.signup.subtitle">
      <GoogleAuthButton onClick={handleGoogleAuth} disabled={loading} />

      <div className="auth-divider">{t("auth.or")}</div>

      <div className="auth-field">
        <label htmlFor="signup-name">{t("auth.fullName")}</label>
        <input
          id="signup-name"
          type="text"
          placeholder={t("auth.fullNamePlaceholder")}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-username">{t("auth.username")}</label>
        <input
          id="signup-username"
          type="text"
          placeholder={t("auth.usernamePlaceholder")}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className={`auth-field ${showPasswordError ? "auth-field--error" : ""}`}>
        <label htmlFor="signup-password">{t("auth.password")}</label>
        <input
          id="signup-password"
          type="password"
          placeholder={t("auth.passwordPlaceholder")}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {showPasswordError && (
          <span className="auth-field__error">{t("auth.passwordRule")}</span>
        )}
      </div>

      <div className={`auth-field ${showConfirmError ? "auth-field--error" : ""}`}>
        <label htmlFor="signup-confirm">{t("auth.confirmPassword")}</label>
        <input
          id="signup-confirm"
          type="password"
          placeholder={t("auth.confirmPlaceholder")}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {showConfirmError && (
          <span className="auth-field__error">{t("auth.passwordsNoMatch")}</span>
        )}
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
          id="remember-me-signup"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <label htmlFor="remember-me-signup">{t("auth.rememberMe")}</label>
      </div>

      <button type="button" className="auth-submit" onClick={handleSignup} disabled={loading}>
        {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
        <span>{loading ? t("auth.signingUp") : t("auth.signupCta")}</span>
      </button>

      <p className="auth-switch">
        {t("auth.haveAccount")}{" "}
        <Link to="/signin">{t("auth.loginLink")}</Link>
      </p>
    </AuthShell>
  );
};

export default SignupForm;
