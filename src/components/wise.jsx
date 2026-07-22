import React, { useEffect, useState } from "react";
import * as framer from "framer-motion";
import quotes from "../wisdom/wisdoms1.json";

import img4 from '../image/4.jpg';
// import img5 from '../image/5.jpg';
import img6 from '../image/6.jpg';
import img7 from '../image/7.jpg';
import img8 from '../image/8.jpg';
import img9 from '../image/9.jpg';
import img10 from '../image/10.jpg';
import img11 from '../image/11.jpg';
import img12 from '../image/12.jpg';

const { motion, AnimatePresence } = framer;

export default function QuoteSlider() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [image, setimage] = useState("");


  const images = [

    img4,
    // img5,
    img6,
    img7,
    img8,
    img9,
    img10,
    img11,
    img12,
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * quotes.length);
      } while (newIndex === index); // حتى لا يتكرر الاقتباس نفسه

      setIndex(newIndex);
      setimage(images[Math.floor(Math.random() * images.length)]);
    }, 2 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(interval);
  }, [index]);

  const current = quotes[index];




  // تحديد لون الصون لتغير لون الخط


  

  
  return (
    <div
      className="flex items-center justify-center bg-gray-100 p-4 rounded-xl"
      style={{
        backgroundImage:`url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "97%",
        height: "400px",
        transition: "background-image 0.6s ease-in-out",
        marginTop:"70px",
        borderRadius:"10px",
        display:"flex",
        justifyContent:"center",
        justifySelf:"center",
        alignItems:"center",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="text-xl font-semibold text-center px-4"
          style={{
            maxWidth: "90%",
            lineHeight: "1.8",
            fontSize:"35px",
            fontWeight:"500",
            color:"black"
          }}
        >
          <p>❝ {current.quote} ❞</p>
          <p className="mt-2 text-sm font-normal">— {current.author}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
