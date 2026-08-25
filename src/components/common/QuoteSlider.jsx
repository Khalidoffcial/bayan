import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import useQuoteSlider from "../../hooks/useQuoteSlider";

export default function QuoteSlider() {
  const { index, image, currentQuote } = useQuoteSlider();

  return (
    <div
      className="quote-slider flex items-center justify-center bg-gray-100 p-4 rounded-xl"
      style={{
        backgroundImage: image ? `url(${image})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "97%",
        height: "400px",
        transition: "background-image 0.6s ease-in-out",
        marginTop: "70px",
        borderRadius: "10px",
        display: "flex",
        justifyContent: "center",
        justifySelf: "center",
        alignItems: "center",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="quote-slider__text text-xl font-semibold text-center px-4"
          style={{
            maxWidth: "90%",
            lineHeight: "1.8",
            fontSize: "35px",
            fontWeight: "500",
            color: "black",
          }}
        >
          <p>❝ {currentQuote.quote} ❞</p>
          {currentQuote.author && (
            <p className="quote-slider__author mt-2 text-sm font-normal">— {currentQuote.author}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

