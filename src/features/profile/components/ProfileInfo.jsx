import React from "react";
import { FaPen, FaCheck, FaUserPlus } from "react-icons/fa";
import { SlUserFollow } from "react-icons/sl";

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
  followMode,
  onFollow,
  onUnfollow,
}) => {
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
            <button onClick={onSaveName} className="save-btn" aria-label="Save name">
              <FaCheck />
            </button>
          </div>
        ) : (
          <div className="display-wrapper">
            <h1>{name || "User Name"}</h1>
            {editable && (
              <button onClick={onEditName} className="edit-btn" aria-label="Edit name">
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
            <button onClick={onSaveBio} className="save-btn" aria-label="Save bio">
              <FaCheck />
            </button>
          </div>
        ) : (
          <div className="display-wrapper">
            <p>{bio || "No bio yet."}</p>
            {editable && (
              <button onClick={onEditBio} className="edit-btn" aria-label="Edit bio">
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
              <FaUserPlus /> Follow
            </button>
          ) : (
            <button className="unfollow-btn" onClick={onUnfollow}>
              <SlUserFollow /> Unfollow
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfileInfo);
