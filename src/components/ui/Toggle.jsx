import React from "react";

export const Toggle = ({ checked, onChange, disabled = false, id }) => {
  return (
    <label className={`toggle-switch ${disabled ? "disabled" : ""}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .toggle-switch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .toggle-track {
          position: absolute;
          inset: 0;
          background: var(--input-bg, rgba(0, 0, 0, 0.15));
          border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
          border-radius: 999px;
          transition: background 0.25s ease, border-color 0.25s ease;
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .toggle-switch input:checked + .toggle-track {
          background: var(--teal, #27ade2);
          border-color: var(--teal, #27ade2);
        }
        .toggle-switch input:checked + .toggle-track .toggle-thumb {
          transform: translateX(20px);
        }
      `}</style>
    </label>
  );
};

export default Toggle;
