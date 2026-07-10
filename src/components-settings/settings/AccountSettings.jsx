import { useState } from "react";

export default function AccountSettings() {
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
    console.log(password);
    // TODO: Update password API
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
            <label className="field-label">New Password</label>

            <input
              className="field-input"
              type="password"
              name="password"
              placeholder="Min 8 characters"
              value={password.password}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label className="field-label">Confirm Password</label>

            <input
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

          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            Update password
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-title">⚠ Danger Zone</div>

        <p className="danger-desc">
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
}