import React from "react";
import { Pen as FaPen, Check as FaCheck, UserPlus as FaUserPlus } from "lucide-react";

import { useTranslation } from "../../../i18n/useTranslation";

export const ProfileInfo = ({
  name,
  bio,
  editable,
  editingName,
  editingBio,
  onEditName,
  onEditBio,
  onSaveName,
  onSaveBio,
  setName,
  setBio,
  savingField,
  followMode,
  onFollow,
  onUnfollow,
}) => {
  const savingBio = savingField === "bio";
  const savingName = savingField === "name";
  const { t } = useTranslation();
  return (
    <div className="profile-info">
      <div className="name-section">
        {editingName ? (
          <div className="edit-input-wrapper">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="edit-input"
              autoFocus
            />
            <button
              onClick={onSaveName}
              className="save-btn"
              aria-label={t("profile.saveName")}
              disabled={savingName}
            >
              {savingName ? "..." : <FaCheck />}
            </button>
          </div>
        ) : (
          <div className="display-wrapper">
            <h1>{name || t("profile.defaultName")}</h1>
            {editable && (
              <button onClick={onEditName} className="edit-btn" aria-label={t("profile.editName")}>
                <FaPen />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bio-section">
        {editingBio ? (
          <div className="edit-input-wrapper">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="edit-textarea"
              autoFocus
            />
            <button
              onClick={onSaveBio}
              className="save-btn"
              aria-label={t("profile.saveBio")}
              disabled={savingBio}
            >
              {savingBio ? "..." : <FaCheck />}
            </button>
          </div>
        ) : (
          <div className="display-wrapper">
            <p>{bio || t("profile.noBio")}</p>
            {editable && (
              <button onClick={onEditBio} className="edit-btn" aria-label={t("profile.editBio")}>
                <FaPen />
              </button>
            )}
          </div>
        )}
      </div>

      {!editable && (
        <div className="follow-section">
          {followMode ? (
            <button className="follow-btn" onClick={onFollow}>
              <FaUserPlus /> {t("profile.follow")}
            </button>
          ) : (
            <button className="unfollow-btn" onClick={onUnfollow}>
              <FaUserPlus /> {t("profile.unfollow")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfileInfo);
