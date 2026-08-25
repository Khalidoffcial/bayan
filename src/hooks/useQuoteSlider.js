import { useState, useEffect } from "react";
import quotes from "../assets/data/wisdoms1.json";

import img4 from '../assets/images/4.webp';
import img6 from '../assets/images/6.webp';
import img7 from '../assets/images/7.webp';
import img8 from '../assets/images/8.webp';
import img9 from '../assets/images/9.webp';
import img10 from '../assets/images/10.webp';
import img11 from '../assets/images/11.webp';
import img12 from '../assets/images/12.webp';
import img13 from '../assets/images/13.webp';

const IMAGES = [img4, img6, img7, img8, img9, img10, img11, img12, img13];

export const useQuoteSlider = (intervalMs = 2 * 60 * 1000) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [image, setImage] = useState(() => IMAGES[Math.floor(Math.random() * IMAGES.length)]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * quotes.length);
        } while (newIndex === prevIndex && quotes.length > 1);
        return newIndex;
      });
      setImage(IMAGES[Math.floor(Math.random() * IMAGES.length)]);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  const currentQuote = quotes[index] || { quote: "", author: "" };

  return { index, image, currentQuote };
};

export default useQuoteSlider;
