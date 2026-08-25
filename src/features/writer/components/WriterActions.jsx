import React from "react";

export const WriterActions = ({ onCancel, onPublish, isSubmitting }) => {
  return (
    <div className="WriterActions">
      <button className="cancelBtn" onClick={onCancel} type="button">
        Cancel
      </button>
      <button
        className="submitBtn"
        onClick={onPublish}
        disabled={isSubmitting}
        type="button"
      >
        {isSubmitting ? "Publishing..." : "Publish"}
      </button>
    </div>
  );
};

export default React.memo(WriterActions);
