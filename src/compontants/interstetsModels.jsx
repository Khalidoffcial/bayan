import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./interstetsModels.css";

const socket = io("bayan-production-9dd3.up.railway.app:9000");

export default function InterestsPopup() {
  const [showModal, setShowModal] = useState(true);
  const [idUser, setidUser] = useState(localStorage.getItem("me"));
  const [selected, setSelected] = useState({
    articles: [],
    novels: [],
  });

  useEffect(()=>{
    setidUser(localStorage.getItem("me"))
  },[localStorage.getItem("me")])

  const categories = {
    articles: [
      "Religious",
      "Educational",
      "Scientific",
      "Political",
      "Economic",
      "Literary",
      "Technical",
      "Social",
      "Entertainment",
      "Sports",
    ],
    novels: [
      "Romance",
      "Fantasy",
      "Mystery",
      "Thriller",
      "Adventure",
      "Science Fiction",
    ],
  };

  const toggleSelection = (type, value) => {
    setSelected((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      };
    });
  };

  const handleSubmit = () => {
    socket.emit("setInterests",JSON.parse(idUser).id,selected);
    socket.on("result", (v) => {
      console.log("okkkkk");
      
      if (v.status === "ok") { 
          console.log("okkk22");
              localStorage.setItem("userInterests", JSON.stringify(selected));
              setShowModal(false);
          }
       })
  };

  useEffect(() => {
    const saved = localStorage.getItem("userInterests");
    if (saved) setShowModal(false);
  }, []);

  if (!showModal) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2 className="popup-title">Choose your interests</h2>

        <div className="popup-section">
          <h3>Articles</h3>
          <div className="popup-options">
            {categories.articles.map((item) => (
              <button
                key={item}
                className={`option-btn ${
                  selected.articles.includes(item) ? "active" : ""
                }`}
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
            {categories.novels.map((item) => (
              <button
                key={item}
                className={`option-btn ${
                  selected.novels.includes(item) ? "active" : ""
                }`}
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