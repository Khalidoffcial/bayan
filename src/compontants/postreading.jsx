import React, { useEffect, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaImage,
  FaTimes,
  FaHeart,
  FaComment,
  FaShareAlt,
} from "react-icons/fa";

import axios from "axios";
import { io } from "socket.io-client";

import cookie from "../databases/cookies_DAO.js";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "./firebase.js";

import Top from "./top";
import Sidebar from "./sidebar.jsx";
import default_img from "../icons/user_10374408.png";

// ======================================================
// SOCKET
// ======================================================

const SOCKET_URL =
  "https://bayan.railway.internal:9000";


// ======================================================
// TEXT DIRECTION
// ======================================================

const getDirection = (text = "") => {
  const rtlRegex = /[\u0591-\u07FF]/;
  return rtlRegex.test(text) ? "rtl" : "ltr";
};

const Postreading = () => {
  // ======================================================
  // ROUTER
  // ======================================================

  const { postId } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  // ======================================================
  // STATES
  // ======================================================

  const [dataPost, setDataPost] = useState(null);

  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);

  const [likesCount, setLikesCount] = useState(0);

  const [commented, setCommented] = useState(false);

  const [content, setContent] = useState("");

  const [images, setImages] = useState([]);

  const [imagesPreview, setImagesPreview] = useState([]);

  const [showImage, setShowImage] = useState(false);

  const [imageToFullscreen, setImageToFullscreen] =
    useState(null);

    // ==================================================
    // REFS
    // ==================================================
    
    const articleRef = useRef(null);
  const socketRef =
    useRef(null);


  // ======================================================
  // SOCKET INIT
  // ======================================================

  useEffect(() => {
    socketRef.current = io(
      SOCKET_URL
    );

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);



  // ======================================================
  // USER ID
  // ======================================================

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

  // ======================================================
  // IMAGE CHANGE
  // ======================================================

  const handleImageChange = (e) => {

    const files =
      Array.from(e.target.files);

    setImages((prev) => [
      ...prev,
      ...files,
    ]);

    const previews =
      files.map((file) =>
        URL.createObjectURL(file)
      );

    setImagesPreview((prev) => [
      ...prev,
      ...previews,
    ]);
  };

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const handleClose = () => {

    setCommented(false);

    setContent("");

    setImages([]);

    setImagesPreview([]);
  };

  // ======================================================
  // SAVE IMAGES
  // ======================================================

  const saveImages = async () => {

    if (!images.length)
      return [];

    try {

      const uploadPromises =
        images.map(async (
          img,
          index
        ) => {

          const uniqueId = `${Date.now()}_${index}_${img.name}`;

          const imgRef =
            storageRef(
              storage,
              `images/${uniqueId}`
            );

          await uploadBytes(
            imgRef,
            img
          );

          return await getDownloadURL(
            imgRef
          );
        });

      return await Promise.all(
        uploadPromises
      );

    } catch (error) {

      console.error(
        "❌ Error uploading images:",
        error
      );

      return [];
    }
  };

  // ======================================================
  // GENERATE POST ID
  // ======================================================

  const generateID = () =>
    Math.floor(
      1000 + Math.random() * 9000
    );

  // ======================================================
  // SAVE COMMENT
  // ======================================================

  const savePost = async () => {

    if (!content.trim()) {

      alert(
        "❗ الرجاء كتابة تعليق"
      );

      return;
    }

    try {

      const uploadedImages =
        await saveImages();

      await axios.post(
        "http://192.168.1.9:4000/saveposts",
        {
          autherID:
            getUserId(),

          id: generateID(),

          comment_on:
            location.state.id,

          img: uploadedImages,

          content,

          type: "posts",
        },
        {
          headers: {
            Authorization:
              "Bearer " +
              cookie("get"),
          },
        }
      );

      handleClose();

    } catch (err) {

      console.log(
        "Save comment error:",
        err.message
      );
    }
  };

  // ======================================================
  // LOAD ARTICLE
  // ======================================================

  useEffect(() => {

    try {

      if (location.state) {

        setDataPost(
          location.state
        );

        if (
          location.state?.img?.length
        ) {

          setImageUrl(
            location.state.img[0]
          );
        }

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

  }, [postId, location.state]);

  // ======================================================
  // ACTIONS
  // ======================================================

  const handleBack = () => {
    navigate(-1);
  };

  const handleLike = () => {

    setLiked((prev) => !prev);

    setLikesCount((prev) =>
      liked ? prev - 1 : prev + 1
    );


    socketRef.current?.emit(
      "ENGAGEMENT",{
      contentId:dataPost.id,
      userId:getUserId(),
      type:liked?"like":"unlike"
    }
    );

  };

  const handleComment = () => {
    setCommented(true);
  };

  const handleShare = async () => {

    try {

      if (navigator.share) {

        await navigator.share({
          title:
            dataPost?.content ||
            "Post",

          text:
            dataPost?.content?.slice(
              0,
              100
            ),

          url:
            window.location.href,
        });

      } else {

        alert(
          "Sharing not supported"
        );
      }

    } catch (err) {

      console.log(err);
    }
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
  // NO POST
  // ======================================================

  if (!dataPost) {

    return (
      <div className="loading">
        <h1>
          المقال غير موجود
        </h1>
      </div>
    );
  }

  // ======================================================
  // CONTENT DIRECTION
  // ======================================================

  const contentDir =
    getDirection(
      dataPost.content
    );

  // ======================================================
  // UI
  // ======================================================

  return (
    <>
      {/* SEO */}

      <Helmet>

        <meta
          name="keywords"
          content="تكنولوجيا, ذكاء اصطناعي, علوم, تطوير"
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
          content="post"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:image"
          content={imageUrl}
        />

      </Helmet>

      <Top />

      <Sidebar />

      <div className="w"></div>

      {/* COMMENT MODAL */}

      <AnimatePresence>

        {commented && (
          <>
            <motion.div
              className="Backdrop"
              onClick={handleClose}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 0.5,
              }}
              exit={{
                opacity: 0,
              }}
            />

            <motion.div
              className="WriterModal"
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
              }}
            >

              <div className="WriterHeader">

                <h3>
                  Write Comment
                </h3>

                <button
                  className="closeBtn"
                  onClick={
                    handleClose
                  }
                >
                  ✖
                </button>

              </div>

              {/* IMAGE PREVIEW */}

              <div className="image-gallery">

                {imagesPreview.map(
                  (
                    img,
                    i
                  ) => (
                    <div
                      key={i}
                      className="image-card"
                    >

                      <button
                        className="remove-btn"
                        onClick={() =>
                          setImagesPreview(
                            (
                              prev
                            ) =>
                              prev.filter(
                                (
                                  _,
                                  index
                                ) =>
                                  index !==
                                  i
                              )
                          )
                        }
                      >
                        <FaTimes />
                      </button>

                      <img
                        src={img}
                        alt="preview"
                        onClick={() => {

                          setShowImage(
                            true
                          );

                          setImageToFullscreen(
                            img
                          );
                        }}
                      />

                    </div>
                  )
                )}

                <label className="upload-card">

                  <FaImage size={40} />

                  <p>
                    Upload
                    Image
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={
                      handleImageChange
                    }
                  />

                </label>

              </div>

              {/* FULLSCREEN IMAGE */}

              {showImage && (
                <div
                  className="image-modal"
                  onClick={() =>
                    setShowImage(
                      false
                    )
                  }
                >

                  <img
                    src={
                      imageToFullscreen
                    }
                    alt="fullscreen"
                    className="fullscreen-image"
                  />

                </div>
              )}

              {/* TEXTAREA */}

              <textarea
                className="WriterInput"
                placeholder="Write your comment..."
                value={content}
                onChange={(e) =>
                  setContent(
                    e.target.value
                  )
                }
              />

              {/* ACTIONS */}

              <div className="WriterActions">

                <button
                  className="cancelBtn"
                  onClick={
                    handleClose
                  }
                >
                  Cancel
                </button>

                <button
                  className="submitBtn"
                  onClick={savePost}
                >
                  Publish
                </button>

              </div>

            </motion.div>
          </>
        )}

      </AnimatePresence>

      {/* PAGE */}

      <div className="homepage">

        {/* BACK */}

        <button
          className="back"
          onClick={handleBack}
        >

          <h1>
            Back
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

        {/* POST */}

        <div className="container_post">

          {/* IMAGE */}

          {imageUrl && (
            <div className="img_article">

              <img
                src={imageUrl}
                alt={
                  dataPost.content
                }
              />

            </div>
          )}


          <div className="account"
                      onClick={() =>
                navigate(
                  `/p/${dataPost.userData
                    ?.Id_user}`
                )
              }
          >

            <img
              src={
                dataPost.userData
                  ?.imgProfile ||
                default_img
              }
              className="profile-pic-posts"
              alt=""
            />

              <div className="names">
                <h2 className="nameacc">
                {
                  dataPost.userData
                    ?.F_user
                }
              </h2>

              <p className="usernameacc">

                {
                  dataPost.userData
                    ?.S_user
                }
              </p>

            </div>

          </div>



          {/* CONTENT */}

          <div
            ref={articleRef}
            className="content_Post"
            dir={contentDir}
            style={{
              textAlign:
                contentDir ===
                "rtl"
                  ? "right"
                  : "left",
            }}
            dangerouslySetInnerHTML={{
              __html:
                dataPost.content,
            }}
          />

          {/* DATE */}

          <div className="his_Post">
            {dataPost.date}
          </div>

          {/* ACTIONS */}

          <div className="actions">

            <button
              className="like_action"
              onClick={
                handleLike
              }
              style={{
                color: liked
                  ? "#d30000"
                  : "#333",
              }}
            >
              <FaHeart />
              <span>
                {likesCount}
              </span>
            </button>

            <button
              className="comment_action"
              onClick={
                handleComment
              }
            >
              <FaComment />
              Comment
            </button>

            <button
              className="share_action"
              onClick={
                handleShare
              }
            >
              <FaShareAlt />
              Share
            </button>

          </div>

        </div>

      </div>
    </>
  );
};
export default Postreading;