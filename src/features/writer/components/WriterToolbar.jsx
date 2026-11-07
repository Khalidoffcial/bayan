import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";

export const WriterToolbar = ({ activeType, onTypeChange }) => {
  const { t } = useTranslation();
  const types = [
    { id: "post", label: t("writer.type.post") },
    { id: "article", label: t("writer.type.article") },
    { id: "novels", label: t("writer.type.novels") },
  ];

  return (
    <div className="TypeSelector">
      {types.map((type) => (
        <button
          key={type.id}
          className={activeType === type.id ? "active" : ""}
          onClick={() => onTypeChange(type.id)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

export default React.memo(WriterToolbar);
