import React from "react";
import Cropper from "react-easy-crop";

export const ProfileEditModal = ({
  image,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onSave,
  onCancel,
}) => {
  return (
    <div className="crop-modal">
      <div className="crop-container">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="crop-actions">
        <button onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
        <button onClick={onSave} className="save-btn">
          Save
        </button>
      </div>
    </div>
  );
};

export default React.memo(ProfileEditModal);
