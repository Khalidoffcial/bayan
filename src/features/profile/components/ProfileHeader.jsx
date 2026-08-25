import React from "react";
import { FaPen } from "react-icons/fa";
import defaultImg from "../../../assets/icons/user_10374408.png";

export const ProfileHeader = ({
  imageUrl,
  editable,
  onImageClick,
  onDropdownToggle,
  dropdownOpen,
}) => {
  return (
    <div className="profile-header">
      <div className="profile-image-container">
        <div className="profile-pic-wrapper" onClick={onImageClick}>
          <img
            src={imageUrl || defaultImg}
            alt="Profile"
            className="profile-pic"
          />
          {editable && (
            <div className="edit-overlay">
              <FaPen className="edit-icon" />
            </div>
          )}
        </div>

        {editable && dropdownOpen && (
          <div className="image-dropdown">
            <button onClick={() => onDropdownToggle("view")}>View Image</button>
            <button onClick={() => onDropdownToggle("change")}>Change Image</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProfileHeader);
