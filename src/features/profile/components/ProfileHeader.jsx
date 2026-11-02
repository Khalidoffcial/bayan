import React, { useState } from "react";
import { FaPen } from "react-icons/fa";
import defaultImg from "../../../assets/icons/user_10374408.png";
import ProfileImageViewer from "../../../components/common/ProfileImageViewer";

export const ProfileHeader = ({
  imageUrl,
  editable,
  onImageClick,
  onDropdownToggle,
  dropdownOpen,
}) => {
  // Unified image viewer — "View Image" and clicking the picture itself
  // open the SAME viewer with the SAME (user's real) image URL.
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleDropdownAction = (action) => {
    if (action === "view") {
      if (imageUrl) setViewerOpen(true); // nothing to view without a real URL
      return;
    }
    onDropdownToggle?.(action); // "change" → open the file picker
  };

  return (
    <div className="profile-header">
      <div className="profile-image-container">
        <div
          className="profile-pic-wrapper"
          onClick={() => {
            if (editable) {
              onImageClick?.(); // owner → toggles the edit dropdown
            } else if (imageUrl) {
              setViewerOpen(true); // other users' profile pics open the viewer
            }
          }}
          style={imageUrl ? { cursor: "zoom-in" } : undefined}
        >
          <img
            src={imageUrl || defaultImg}
            alt="Profile"
            className="profile-pic"
            draggable={false}
          />
          {editable && (
            <div className="edit-overlay">
              <FaPen className="edit-icon" />
            </div>
          )}
        </div>

        {editable && dropdownOpen && (
          <div className="image-dropdown">
            <button onClick={() => handleDropdownAction("view")}>View Image</button>
            <button onClick={() => handleDropdownAction("change")}>Change Image</button>
          </div>
        )}

        <ProfileImageViewer
          imageUrl={imageUrl || ""}
          alt="Profile"
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      </div>
    </div>
  );
};

export default React.memo(ProfileHeader);
