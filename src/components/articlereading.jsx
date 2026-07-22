import React, {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  Helmet,
} from "react-helmet-async";

import { motion, AnimatePresence } from "framer-motion";
import { FaImage, FaTimes } from "react-icons/fa";
import cookie from "../databases/cookies_DAO.js";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject,listAll } from 'firebase/storage';
import { storage } from './firebase.js';

import axios from "axios";


import Top from "./top";


import { FaHeart, FaComment, FaShareAlt } from "react-icons/fa";

// ======================================================
// AUTO TEXT DIRECTION
// ======================================================

const getDirection = (text = "") => {

  const rtlRegex =
    /[\u0591-\u07FF]/;

  return rtlRegex.test(text)
    ? "rtl"
    : "ltr";
};

const Articlereading = () => {

  // ======================================================
  // ROUTER
  // ======================================================

  const { articleId } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  // ======================================================
  // STATES
  // ======================================================

  const [dataArticle,
    setDataArticle] =
    useState(null);

  const [imageUrl,
    setImageUrl] =
    useState("");

  const [loading,
    setLoading] =
    useState(true);

  const articleRef =
    useRef(null);



      const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commented, setComment] = useState(false);
  
    const [content, setContent] = useState("");

    const [images_Preview, setImages_Preview] = useState([]);
  const [images, setImages] = useState([]);
  const [showImage, setShowImage] = useState(false);//images
  const [imageToFullscreen, setImageToFullscreen] = useState(null);

  // ======================================================
  // LOAD ARTICLE
  // ======================================================

  useEffect(() => {

    try {

      if (location.state) {

        setDataArticle(
          location.state
        );

        // IMAGE

        if (
          location.state?.img?.length > 0
        ) {

          setImageUrl(
            location.state.img[0]
          );
        }

        console.log(
          "✅ Article Loaded:",
          location.state
        );

      } else {

        console.log(
          "❌ No article found"
        );
      }

    } catch (err) {

      console.log(
        "Article load error:",
        err.message
      );

    } finally {

      setLoading(false);
    }

  }, [articleId]);

  // ======================================================
  // BACK
  // ======================================================

  const handleback = () => {

    navigate(-1);
  };

  
    const getUserId = () => {
    try {

      const user =
        localStorage.getItem("me");

      return user
        ? JSON.parse(user).id
        : null;

    } catch (err) {

      console.log(
        "User parse error:",
        err.message
      );

      return null;
    }
  };


const handleImageChange = (e) => {
  const files = Array.from(e.target.files);

  // نضيف الملفات الأصلية
  setImages((prev) => [...prev, ...files]);

  // نعمل URLs للعرض فقط
  const newPreviews = files.map((file) => URL.createObjectURL(file));
  setImages_Preview((prev) => [...prev, ...newPreviews]);
};


  const handleClose = () => {
    setComment(false);
    setContent("");
    setImages_Preview([]);
  };



    // هحفظ صور جديد
    // eslint-disable-next-line no-dupe-class-members
const saveImages = async () =>{

        if (!images || images.length === 0) return [];
  try {
    // نرفع الصور كلها مرة واحدة وننتظر اكتمالها
    const uploadPromises = images.map(async (img, index) => {
      const uniqueId = `${Date.now()}_${index}_${img.name}`; // اسم فريد
      const imgRef = storageRef(storage, `images/${uniqueId}`);

      await uploadBytes(imgRef, img); // رفع الصورة
      const url = await getDownloadURL(imgRef); // الحصول على الرابط
      return url;
    });

    // ننتظر كل الوعود (promises)
    const urls = await Promise.all(uploadPromises);
    return urls;
    

  } catch (error) {
    console.error("❌ Error uploading images:", error);
    return [];
  }
    }





    const generateID = () => Math.floor(1000 + Math.random() * 9000);

  const SavePost = async () => {
    if (!content ) {
      alert("❗ الرجاء تعبئة جميع الحقول  ");
      return;
    }

    const PostId_generated = generateID();
  const uploadedImages = await saveImages(); // 🟢 كده تمام
 axios
        .post(
          "http://bayan.railway.internal:4000/savePosts",
          { 
            autherID:getUserId(),
            id: PostId_generated,
            comment_on:location.state.id,
            img:uploadedImages,
      content,
      type:"Posts"
    },
          {
            headers: {
              Authorization: "Bearer " + cookie("get"),
            },
          }
        )
        .then((res) => {
          if (res.status === 200) {
          }
        })
        .catch(() => {});



  };



    const handleSubmit = () => {
    handleClose();
      SavePost();
  };



  const handleLike = () => {
    setLiked(!liked);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleComment = async () => {
    setComment(true);
  };
  
  // ======================================================
  // DOWNLOAD PDF
  // ======================================================

  const downloadAsPDF = () => {

    if (!window.html2pdf) {

      alert(
        "يرجى تحميل مكتبة html2pdf.js"
      );

      return;
    }

    const element =
      articleRef.current;

    const opt = {

      margin: 0.5,

      filename:
        `${dataArticle?.title || "article"}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
      },

      jsPDF: {
        unit: "in",
        format: "a4",
        orientation:
          "portrait",
      },
    };

    window
      .html2pdf()
      .from(element)
      .set(opt)
      .save();
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <div className="loading">

        <h1>
          جاري التحميل...
        </h1>

      </div>
    );
  }

  // ======================================================
  // NO ARTICLE
  // ======================================================

  if (!dataArticle) {

    return (

      <div className="loading">

        <h1>
          المقال غير موجود
        </h1>

      </div>
    );
  }

  // ======================================================
  // DIRECTION
  // ======================================================

  const titleDir =
    getDirection(
      dataArticle.title
    );

  const descripDir =
    getDirection(
      dataArticle.descrip
    );

  const contentDir =
    getDirection(
      dataArticle.content
    );

  // ======================================================
  // UI
  // ======================================================

  return (
    <>

      {/* ======================================================
          SEO
      ====================================================== */}

      <Helmet>

        <title>
          {
            dataArticle.title ||
            "مقالة"
          }
        </title>

        <meta
          name="description"
          content={
            dataArticle.descrip ||
            "وصف المقالة"
          }
        />

        <meta
          name="keywords"
          content="
          مقالة,
          رواية,
          تكنولوجيا,
          ذكاء اصطناعي,
          علوم,
          تطوير,
          تعليم
        "
        />

        {/* OPEN GRAPH */}

        <meta
          property="og:title"
          content={
            dataArticle.title
          }
        />

        <meta
          property="og:description"
          content={
            dataArticle.descrip
          }
        />

        <meta
          property="og:image"
          content={imageUrl}
        />

        <meta
          property="og:url"
          content={
            window.location.href
          }
        />

        <meta
          property="og:type"
          content="article"
        />

        {/* TWITTER */}

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={
            dataArticle.title
          }
        />

        <meta
          name="twitter:description"
          content={
            dataArticle.descrip
          }
        />

        <meta
          name="twitter:image"
          content={imageUrl}
        />

      </Helmet>

      {/* ======================================================
          TOP
      ====================================================== */}

      <Top />

      {/* ======================================================
          ADS
      ====================================================== */}

      {/* <PropellerAd /> */}

      <div className="w"></div>

      {/* ======================================================
          BACK BUTTON
      ====================================================== */}

      <button
        className="back"
        onClick={handleback}
      >

      {/* write the comment */}
      {/* النافذة المنبثقة */}
      <AnimatePresence>
        {setComment && (
          <motion.div
            className="WriterModal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="WriterHeader">
              <h3>Write something new</h3>
              <button onClick={handleClose} className="closeBtn">✖</button>
            </div>



 {/* Upload Section */}
 <div className="upload-container">

      {/* Image Cards Preview */}
      <div className="image-gallery">
        <AnimatePresence>
          {images_Preview.map((img, i) => (
            <motion.div
              key={img}
              className="image-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <button
                className="remove-btn"
                onClick={() =>
                  setImages_Preview((prev) => prev.filter((imgSrc) => imgSrc !== img))
                }
              >
                <FaTimes />
              </button>
              <img
                src={img}
                alt={`preview-${i}`}
                onClick={() => {
                  setShowImage(true);
                  setImageToFullscreen(img);
                }}
              />
            </motion.div>
          ))}

                {/* Upload Card */}
      <label htmlFor="upload-image" className="upload-card">
        <FaImage size={40} />
        <p>Upload Image(s)</p>
        <input
          id="upload-image"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          hidden
        />
      </label>
        </AnimatePresence>
      </div>

      {/* Fullscreen Preview */}
      {showImage && (
        <motion.div
          className="image-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowImage(false)}
        >
          <motion.img
            src={imageToFullscreen}
            alt="Full view"
            className="fullscreen-image"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </div>



              <textarea
              className="WriterInput"
              placeholder={`Write your comments here...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            

            <div className="WriterActions">
              <button className="cancelBtn" onClick={handleClose}>
                Cancel
              </button>
              <button className="submitBtn" onClick={handleSubmit}>
                Publish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الخلفية المعتمة */}
      <AnimatePresence>
        {commented && (
          <motion.div
            className="Backdrop"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>


        <h1>
          back
        </h1>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >

          <polyline points="15 18 9 12 15 6" />

        </svg>

      </button>

      {/* ======================================================
          ARTICLE
      ====================================================== */}

      <div
        className="article_information"
        ref={articleRef}
      >

        {/* IMAGE */}

        {imageUrl && (

          <div className="img_article">

            <img
              src={imageUrl}
              alt={
                dataArticle.title
              }
            />

          </div>
        )}

        {/* TITLE */}

        <div
          className="title"
          dir={titleDir}
          style={{
            textAlign:
              titleDir === "rtl"
                ? "right"
                : "left",
          }}
        >

          {dataArticle.title}

        </div>

        {/* DESCRIPTION */}

        <div
          className="descrip"
          dir={descripDir}
          style={{
            textAlign:
              descripDir === "rtl"
                ? "right"
                : "left",
          }}
        >

          {dataArticle.descrip}

        </div>

        {/* DATE */}

        <div className="his">

          {dataArticle.date}

        </div>

        {/* CONTENT */}

        <div
          className="content_Article"
          dir={contentDir}
          style={{
            textAlign:
              contentDir === "rtl"
                ? "right"
                : "left",
          }}
          dangerouslySetInnerHTML={{
            __html:
              dataArticle.content,
          }}
        />

      </div>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div
        className="actions"
        style={{

          marginTop: "20px",

          display: "flex",

          gap: "10px",

          justifyContent:
            "center",

          flexWrap: "wrap",
        }}
      >

            {/* LIKE */}
            <button
              className="like_action"

              onClick={handleLike}
              style={{
                color: liked ? "#d30000" : "#333",
              }}
            >
              <FaHeart />
              <span>{likesCount}</span>
            </button>



            
            {/* COMMENT */}
            <button
              className="comment_action"

              onClick={handleComment}

            >
              <FaComment />
              Comment
            </button>


        {/* PDF */}

        <button
          onClick={downloadAsPDF}
          className="btn-download-pdf"
          style={{

            backgroundColor:
              "#1a202c",

            color: "white",

            padding:
              "10px 18px",

            borderRadius: "8px",

            cursor: "pointer",

            border: "none",

            fontSize: "16px",
          }}
        >

          تحميل كـ PDF

        </button>

      </div>
    </>
  );
};

export default Articlereading;