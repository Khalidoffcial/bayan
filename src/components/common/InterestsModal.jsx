import React, { useState, useEffect, useCallback } from "react";
import useSocket from "../../hooks/useSocket";
import useAuth from "../../hooks/useAuth";
import { CATEGORIES } from "../../constants/categories";
import "./styles/interestsModal.css";

export default function InterestsPopup() {
  const { user } = useAuth();
  const socketRef = useSocket();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState({ articles: [], novels: [] });

  useEffect(() => {
    const saved = localStorage.getItem("userInterests");
    if (!saved && user) setShowModal(true);
  }, [user]);

  const toggleSelection = useCallback((type, value) => {
    setSelected((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      };
    });
  }, []);

  const handleSubmit = () => {
    if (!user?.id) return;

    socketRef.current?.emit("setInterests", user.id, selected);
    socketRef.current?.on("result", (v) => {
      if (v.status === "ok") {
        localStorage.setItem("userInterests", JSON.stringify(selected));
        setShowModal(false);
      }
    });
  };

  if (!showModal) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2 className="popup-title">Choose your interests</h2>

        <div className="popup-section">
          <h3>Articles</h3>
          <div className="popup-options">
            {CATEGORIES.articles.map((item) => (
              <button
                key={item}
                className={`option-btn ${selected.articles.includes(item) ? "active" : ""}`}
                onClick={() => toggleSelection("articles", item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="popup-section">
          <h3>Novels</h3>
          <div className="popup-options">
            {CATEGORIES.novels.map((item) => (
              <button
                key={item}
                className={`option-btn ${selected.novels.includes(item) ? "active" : ""}`}
                onClick={() => toggleSelection("novels", item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button className="popup-submit" onClick={handleSubmit}>
          OK
        </button>
      </div>
    </div>
  );
}

