import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";

export const WriterActions = ({ onCancel, onPublish, isSubmitting, canPublish = true }) => {
  const { t } = useTranslation();
  return (
    <div className="WriterActions">
      <button className="cancelBtn" onClick={onCancel} type="button">
        {t("common.cancel")}
      </button>
      <button
        className="submitBtn"
        onClick={onPublish}
        disabled={isSubmitting || !canPublish}
        type="button"
      >
        {isSubmitting ? t("writer.publishing") : t("writer.publish")}
      </button>
    </div>
  );
};

export default React.memo(WriterActions);
