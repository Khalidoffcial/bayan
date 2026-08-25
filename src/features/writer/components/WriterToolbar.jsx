import React from "react";

export const WriterToolbar = ({ activeType, onTypeChange }) => {
  const types = [
    { id: "post", label: "Post" },
    { id: "article", label: "Article" },
    { id: "novels", label: "Novels" },
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
