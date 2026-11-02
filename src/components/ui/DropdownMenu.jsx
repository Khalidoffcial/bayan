import React, { useEffect, useRef, useState } from "react";
import { FaEllipsisH } from "react-icons/fa";
import "./dropdownMenu.css";

/**
 * Small "⋯" trigger menu for post-owner actions.
 * - Closes on outside click and Escape.
 * - Menu item clicks are isolated from the post card click handlers
 *   (stopPropagation on the whole menu root).
 * - RTL + mobile responsive via inline-end anchoring.
 */
export const DropdownMenu = ({ items = [], ariaLabel = "إجراءات" }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="dropdown-menu-root"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaEllipsisH aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-panel" role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`dropdown-item${item.danger ? " dropdown-item--danger" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick?.(e);
              }}
            >
              {item.icon && <item.icon className="dropdown-item-icon" aria-hidden="true" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
