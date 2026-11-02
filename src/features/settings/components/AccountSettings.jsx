import React, { useState } from "react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useTranslation } from "../../../i18n/useTranslation";

export const AccountSettings = () => {
  const { profile, triggerSave } = useSettings();
  const { t } = useTranslation();
  const [password, setPassword] = useState({ password: "", confirmPassword: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">{t("settings.account")}</h1>
        <p className="section-subtitle">{t("settings.account.subtitle")}</p>
      </div>

      <div className="settings-card">
        <div className="field">
          <label className="field-label" htmlFor="acc-name">{t("settings.account.name")}</label>
          <input id="acc-name" className="field-input" type="text" value={profile.name || ""} readOnly />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="acc-username">{t("settings.account.username")}</label>
          <input id="acc-username" className="field-input" type="text" value={profile.username || ""} readOnly />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="acc-email">{t("settings.account.email")}</label>
          <input id="acc-email" className="field-input" type="email" value={profile.email || ""} readOnly />
        </div>
        <p className="card-desc" style={{ marginTop: 12 }}>
          {t("settings.account.readOnly")}
        </p>
      </div>

      <div className="settings-card">
        <div className="card-title">{t("settings.account.security")}</div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="new-password">{t("settings.account.newPassword")}</label>
            <input
              id="new-password"
              className="field-input"
              type="password"
              name="password"
              placeholder={t("settings.account.minChars")}
              value={password.password}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="confirm-new-password">{t("settings.account.confirmPassword")}</label>
            <input
              id="confirm-new-password"
              className="field-input"
              type="password"
              name="confirmPassword"
              placeholder={t("settings.account.repeatPassword")}
              value={password.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="actions-row">
          <button
            className="btn btn-outline"
            onClick={() => setPassword({ password: "", confirmPassword: "" })}
          >
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={triggerSave}
            disabled
            title={t("settings.account.comingSoon")}
          >
            {t("settings.account.updatePassword")}
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-title">{t("settings.account.dangerZone")}</div>
        <p className="danger-desc">{t("settings.account.dangerDesc")}</p>
        <div className="actions-row">
          <button className="btn btn-outline btn-sm" disabled title={t("settings.account.comingSoon")}>
            {t("settings.account.logoutAll")}
          </button>
          <button className="btn btn-danger btn-sm" disabled title={t("settings.account.comingSoon")}>
            {t("settings.account.deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AccountSettings);
