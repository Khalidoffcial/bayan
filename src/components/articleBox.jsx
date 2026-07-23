import { useEffect, useState, useRef, useCallback } from "react";

import "./timeline.css";

import {
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

import {
  FaImage,
  FaTimes,
  FaHeart,
  FaComment,
  FaShareAlt,
} from "react-icons/fa";

import axios from "axios";

import cookie from "../databases/cookies_DAO.js";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "./firebase.js";

import { io } from "socket.io-client";

import Top from "./top.jsx";

import Sidebar from "./sidebar.jsx";

import InterestsPopup from "./interstetsModels.jsx";


import CircularLoader from "./loader.jsx";

import default_img from "../icons/user_10374408.png";

// ======================================================
// SOCKET
// ======================================================

const SOCKET_URL =
  process.env.REACT_APP_SERVER_API;

// ======================================================
// TEXT DIRECTION
// ======================================================

const getDirection = (
  text = ""
) => {
  const rtlRegex =
    /[\u0591-\u07FF]/;

  return rtlRegex.test(text)
    ? "rtl"
    : "ltr";
};

// ======================================================
// COMPONENT
// ======================================================

const ArticleBox = () => {
  // ==================================================
  // ROUTER
  // ==================================================

  const { typeArticle } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  // ==================================================
  // REFS
  // ==================================================

  const socketRef =
    useRef(null);

  const seenIds = useRef(
    new Set()
  );

  const fetchingRef =
    useRef(false);

  const articleRef =
    useRef(null);

  // ==================================================
  // STATES
  // ==================================================

  const [feed, setFeed] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [cursor, setCursor] =
    useState(0);

  const [hasMore, setHasMore] =
    useState(true);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

  // COMMENT MODAL

  const [commented, setCommented] =
    useState(false);

  const [content, setContent] =
    useState("");

  const [images, setImages] =
    useState([]);

  const [
    imagesPreview,
    setImagesPreview,
  ] = useState([]);

  const [showImage, setShowImage] =
    useState(false);

  const [
    imageToFullscreen,
    setImageToFullscreen,
  ] = useState(null);

  // LIKES

  const [likedPosts, setLikedPosts] =
    useState({});

  const [likesCount, setLikesCount] =
    useState({});

  // ==================================================
  // UI CLASS
  // ==================================================

  const isHome =
    location.pathname === "/";

  const dynamicClass = isHome
    ? "home"
    : "other";

  // ======================================================
  // SOCKET INIT
  // ======================================================

  useEffect(() => {
    socketRef.current = io(
      SOCKET_URL,{
          transports: ["websocket", "polling"],
  secure: true,
      }
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
        localStorage.getItem(
          "me"
        );

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

  const handleImageChange = (
    e
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    setImages((prev) => [
      ...prev,
      ...files,
    ]);

    const previews = files.map(
      (file) =>
        URL.createObjectURL(file)
    );

    setImagesPreview((prev) => [
      ...prev,
      ...previews,
    ]);
  };

  // ======================================================
  // CLEAN IMAGE URLS
  // ======================================================

  useEffect(() => {
    return () => {
      imagesPreview.forEach(
        (url) =>
          URL.revokeObjectURL(
            url
          )
      );
    };
  }, [imagesPreview]);

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const handleClose =
    useCallback(() => {
      setCommented(false);

      setContent("");

      setImages([]);

      setImagesPreview([]);

      setShowImage(false);

      setImageToFullscreen(null);
    }, []);

  // ======================================================
  // SAVE IMAGES
  // ======================================================

  const saveImages =
    async () => {
      if (!images.length)
        return [];

      try {
        const uploadPromises =
          images.map(
            async (
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
            }
          );

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
  // GENERATE ID
  // ======================================================

  const generateID = () =>
    Math.floor(
      1000 +
        Math.random() * 9000
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
    `${process.env.REACT_APP_SERVER_API}/savePosts`,
        {
          autherID:
            getUserId(),

          id: generateID(),

          comment_on:
            location.state?.id,

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
  // ACTIONS
  // ======================================================

  const handleLike = (
    postId
  ) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]:
        !prev[postId],
    }));

    setLikesCount((prev) => ({
      ...prev,
      [postId]:
        prev[postId]
          ? likedPosts[postId]
            ? prev[postId] - 1
            : prev[postId] + 1
          : 1,
    }));
  };

  const handleComment = () => {
    setCommented(true);
  };

  const handleShare =
    async (item) => {
      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title:
              item?.content ||
              "Post",

            text:
              item?.content?.slice(
                0,
                100
              ) || "",

            url:
              window.location.href,
          });
        } else {
          alert(
            "Sharing not supported"
          );
        }
      } catch (err) {
        console.log(
          "Share error:",
          err
        );
      }
    };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const userId =
      getUserId();

    if (!userId) return;

    setFeed([]);

    setCursor(0);

    setHasMore(true);

    seenIds.current.clear();

    setLoading(true);

    fetchingRef.current = true;

    
    socketRef.current?.emit(
      "GET_FEED",
      {
        userId,

        type:
          typeArticle ||
          "posts",

        cursor: 0,

        limit: 10,
      }
    );
  }, [
    location.pathname,
    typeArticle,
  ]);

  // ==================================================
  // INFINITE SCROLL
  // ==================================================

  useEffect(() => {
    const handleScroll = () => {
      const {
        scrollTop,
        scrollHeight,
        clientHeight,
      } =
        document.documentElement;

      const nearBottom =
        scrollTop +
          clientHeight >=
        scrollHeight - 200;

      if (
        nearBottom &&
        !loading &&
        hasMore &&
        !fetchingRef.current
      ) {
        const userId =
          getUserId();

        if (!userId) return;

        fetchingRef.current =
          true;

        setLoading(true);

        socketRef.current?.emit(
          "GET_FEED",
          {
            userId,

            type: (typeArticle || "posts").toLowerCase(),

            cursor,

            limit: 10,
          }
        );
      }
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [
    loading,
    cursor,
    hasMore,
    typeArticle,
  ]);

  // ==================================================
  // FEED RESPONSE
  // ==================================================

  useEffect(() => {
    const handleFeed = (
      res
    ) => {
      try {
        const items =
          res?.items || [];
console.log(res);
        const filtered =
          items.filter(
            (item) =>
              !seenIds.current.has(
                item.id
              )
          );

        filtered.forEach(
          (item) =>
            seenIds.current.add(
              item.id
            )
        );

        setFeed((prev) => [
          ...prev,
          ...filtered,
        ]);

        if (
          res.nextCursor !==
          null
        ) {
          setCursor(
            res.nextCursor
          );
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.log(
          "Feed parse error:",
          err.message
        );
      } finally {
        fetchingRef.current =
          false;

        setLoading(false);
      }
    };

    socketRef.current?.on(
      "FEED_RESULT",
      handleFeed
    );

    return () => {
      socketRef.current?.off(
        "FEED_RESULT",
        handleFeed
      );
    };
  }, []);

  // ==================================================
  // REALTIME Posts
  // ==================================================

  useEffect(() => {
    const handleNewPost = (
      post
    ) => {
      if (
        !seenIds.current.has(
          post.id
        )
      ) {
        seenIds.current.add(
          post.id
        );

        setFeed((prev) => [
          post,
          ...prev,
        ]);
      }
    };

    socketRef.current?.on(
      "NEW_POST",
      handleNewPost
    );

    return () => {
      socketRef.current?.off(
        "NEW_POST",
        handleNewPost
      );
    };
  }, []);

  // ==================================================
  // CARD RENDER
  // ==================================================

  const renderCard = (
    item
  ) => {
    if (!item) return null;

    const isPost =
      item.type === "posts";

    const isNovel =
      item.type === "novel";

    const isArticle =
      item.type === "article";

    return (
      <motion.div
        key={item.id}
        className={isPost?"BottomBox":"box"}
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        {/* Posts */}

        {isPost && (
          <div className="container_post">
            {/* USER */}

            <div
              className="account"
              onClick={() =>
                navigate(
                  `/p/${item.userData?.Id_user}`
                )
              }
            >
              <img
                src={
                  item.userData
                    ?.imgProfile ||
                  default_img
                }
                className="profile-pic-Posts"
                alt=""
              />

              <div className="names">
                <h2 className="nameacc">
                  {
                    item.userData?.F_user
                  }
                </h2>

                <p className="usernameacc">
                  {
                    item
                      .userData
                      ?.S_user
                  }
                </p>
              </div>
            </div>

            {/* IMAGE */}

            {item.img
              ?.length >
              0 && (
              <div className="img_article">
                <img
                  src={
                    item.img[0]
                  }
                  alt={
                    item.content
                  }
                />
              </div>
            )}

            {/* CONTENT */}

            <div
              ref={articleRef}
              className="content_Post"
              dir={getDirection(
                item.content
              )}
              onClick={() =>
                navigate(
                  `/rp/${item.id}`,
                  {
                    state:
                      item,
                  }
                )
              }
              style={{
                textAlign:
                  getDirection(
                    item.content
                  ) ===
                  "rtl"
                    ? "right"
                    : "left",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  item.content ||
                  "",
              }}
            />

            {/* DATE */}

            <div className="his_Post">
              {item.date}
            </div>
<hr/>
            {/* ACTIONS */}

            <div className="actions">
              <button
                className="like_action"
                onClick={() =>
                  handleLike(
                    item.id
                  )
                }
                style={{
                  color:
                    likedPosts[
                      item.id
                    ]
                      ? "#d30000"
                      : "#333",
                }}
              >
                <FaHeart />

                <span>
                  {likesCount[
                    item.id
                  ] || 0}
                </span>
              </button>

              <button
                className="comment_action"
                onClick={
                  handleComment
                }
              >
                <FaComment />
              </button>

              <button
                className="share_action"
                onClick={() =>
                  handleShare(
                    item
                  )
                }
              >
                <FaShareAlt />
              </button>
            </div>
          </div>
        )}

        {/* ARTICLES / NOVELS */}

        {(isArticle ||
          isNovel) && (
          <div
            className="article-content"
            onClick={() =>
              navigate(
                `/r/${item.id}`,
                {
                  state:
                    item,
                }
              )
            }
          >
            <h1>
              {item.title}
            </h1>

            <p>
              {item.descrip}
            </p>

            {/* USER */}

            <div className="account">
              <img
                src={
                  item.userData
                    ?.imgProfile ||
                  default_img
                }
                className="profile-pic-Posts"
                alt=""
              />

              <div className="names">
                <h2 className="nameacc">
                  {
                    item
                      .userData
                      ?.F_user
                  }
                </h2>

                <p className="usernameacc">
                  {
                    item
                      .userData
                      ?.S_user
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      {/* TOP */}

      <Top />

      {/* SIDEBAR */}

      <Sidebar />

      {/* INTERESTS */}

      <InterestsPopup />

      {/* TIMELINE */}

      <div
        className={`service_${dynamicClass}`}
      >
        <div
          className="timeline"
          dir="ltr"
        >
          {/* FEED */}

          {feed.length > 0 ? (
            feed.map(
              (item) =>
                renderCard(
                  item
                )
            )
          ) : (
            !loading && (
              <div className="empty-feed">
                <h2>
                  لا يوجد محتوى
                </h2>
              </div>
            )
          )}

          {/* LOADER */}

          {loading && (
            <div className="loader-wrapper">
              <CircularLoader />
            </div>
          )}
        </div>
      </div>

      {/* COMMENT MODAL */}

      <AnimatePresence>
        {commented && (
          <>
            <motion.div
              className="Backdrop"
              onClick={
                handleClose
              }
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
                onChange={(
                  e
                ) =>
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
                  onClick={
                    savePost
                  }
                >
                  Publish
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="overlay"
            onClick={() =>
              setSelectedPost(
                null
              )
            }
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              className="modal"
              onClick={(
                e
              ) =>
                e.stopPropagation()
              }
              initial={{
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
              }}
            >
              <button
                className="close-btn"
                onClick={() =>
                  setSelectedPost(
                    null
                  )
                }
              >
                ×
              </button>

              <h2>
                {
                  selectedPost.content
                }
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ArticleBox;