import React from "react";

export const GoogleAuthButton = ({ onClick, disabled = false, text = "Sign in with Google" }) => {
  return (
    <button
      type="button"
      className="login_with_google_btn"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default GoogleAuthButton;
