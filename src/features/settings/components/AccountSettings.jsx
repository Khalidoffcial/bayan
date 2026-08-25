import React, { useState } from "react";

export const AccountSettings = () => {
  const [password, setPassword] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // Preserved placeholder for password change API
  };

  return (
    <div>
      <div className="settings-card">
        <div className="card-title">
          <span className="card-title-icon">◈</span>
          Security
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              className="field-input"
              type="password"
              name="password"
              placeholder="Min 8 characters"
              value={password.password}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="confirm-new-password">Confirm Password</label>
            <input
              id="confirm-new-password"
              className="field-input"
              type="password"
              name="confirmPassword"
              placeholder="Repeat password"
              value={password.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="actions-row">
          <button
            className="btn btn-outline"
            onClick={() =>
              setPassword({
                password: "",
                confirmPassword: "",
              })
            }
          >
            Cancel
          </button>

          <button className="btn btn-primary" onClick={handleSave}>
            Update password
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-title" style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 8 }}>
          ⚠ Danger Zone
        </div>

        <p className="danger-desc" style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
          These actions are permanent and cannot be undone.
        </p>

        <div className="actions-row">
          <button className="btn btn-outline btn-sm">
            Log out of all devices
          </button>

          <button className="btn btn-danger btn-sm">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AccountSettings);
