import React from "react";
import { motion } from "framer-motion";

function CircularLoader() {
  return (
    <div className="loader-container">
      <motion.div
        className="loader-ring"
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="loader-dot"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <StyleSheet />
    </div>
  );
}

/**
 * ==============   Styles   ================
 */
function StyleSheet() {
  return (
    <style>
      {`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 150px;
          position: relative;
        }

        .loader-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ff0055;
          border-right-color: #00ccff;
          position: absolute;
          box-shadow: 0 0 15px rgba(255, 0, 136, 0.5);
        }

        .loader-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff0055, #00ccff);
          box-shadow: 0 0 15px rgba(0, 204, 255, 0.8);
        }
      `}
    </style>
  );
}

export default CircularLoader;
