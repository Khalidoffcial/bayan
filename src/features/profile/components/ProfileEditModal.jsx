import React from "react";
import Cropper from "react-easy-crop";
import { useTranslation } from "../../../i18n/useTranslation";

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
  const { t } = useTranslation();
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
          {t("common.cancel")}
        </button>
        <button onClick={onSave} className="save-btn">
          {t("common.save")}
        </button>
      </div>
    </div>
  );
};

export default React.memo(ProfileEditModal);
