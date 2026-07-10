import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export default function AccountSettings() {
  const [password, setPassword] = useState({ password: "" });
  const [errors, setErrors] = useState({});

  const initials = form.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (form.password && form.password.length < 8) e.password = "Min 8 characters";
    if (form.password && form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    return e;
  };

  return (
    <div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Security</div>
        <div className="field-row">
          <Field label="New Password" name="password" type="password" placeholder="Min 8 characters" />
          <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat password" />
        </div>
        <div className="actions-row">
          <button className="btn btn-outline" onClick={() => { setForm(f => ({...f, password:"", confirmPassword:""})); }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>Update password</button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-title">⚠ Danger Zone</div>
        <p className="danger-desc">These actions are permanent and cannot be undone. Please be absolutely sure before proceeding.</p>
        <div className="actions-row">
          <button className="btn btn-outline btn-sm">Log out of all devices</button>
          <button className="btn btn-danger btn-sm">Delete account</button>
        </div>
      </div>
    </div>
  );
}
