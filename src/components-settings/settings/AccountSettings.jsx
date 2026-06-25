import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export default function AccountSettings() {
  const { profile, setProfile, triggerSave } = useSettings();
  const [form, setForm] = useState({ ...profile, password: "", confirmPassword: "" });
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

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setProfile({ name: form.name, username: form.username, email: form.email });
    setErrors({});
    triggerSave();
  };

  const Field = ({ label, name, type = "text", placeholder }) => (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="field-input" type={type} placeholder={placeholder}
        value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} />
      {errors[name] && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{errors[name]}</p>}
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Account</h1>
        <p className="section-subtitle">Manage your profile, credentials, and account settings</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Profile</div>
        <div className="avatar-section">
          <div className="avatar-ring">
            {initials}
            <div className="avatar-overlay">📷</div>
          </div>
          <div className="avatar-info">
            <div className="avatar-name">{profile.name}</div>
            <div className="avatar-handle">@{profile.username}</div>
            <button className="btn btn-outline btn-sm">Upload photo</button>
          </div>
        </div>
        <div className="field-row">
          <Field label="Full Name" name="name" placeholder="Your full name" />
          <Field label="Username" name="username" placeholder="username" />
        </div>
        <Field label="Email Address" name="email" type="email" placeholder="email@example.com" />
        <div className="actions-row">
          <button className="btn btn-primary" onClick={handleSave}>Save changes</button>
        </div>
      </div>

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
