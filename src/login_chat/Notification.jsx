import React, { useEffect } from "react";
import "./Notification.css";

export default function Notification({ message, type = "info", duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`notification_${type}`}>
      {message}
    </div>
  );
}
