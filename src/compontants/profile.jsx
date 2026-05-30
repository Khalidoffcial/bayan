import React, { useState, useCallback, useEffect ,useRef} from "react";
import {
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";



import Cropper from "react-easy-crop";
import { 
  FaPen, 
  FaCheck, 
  FaUserFriends, 
  FaUserPlus, 
  FaUserCircle, 
  FaBeer,  
  FaImage,
  FaTimes,
  FaHeart,
  FaComment,
  FaShareAlt, } from "react-icons/fa";
import { SlUserFollow } from "react-icons/sl";

import { ref as storageRef, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io } from "socket.io-client";
import "./Profile.css";
import Sidebar from './sidebar.jsx';
import Top from './top.jsx';
import default_img from "../icons/user_10374408.png";
import cookie from "../databases/cookies_DAO.js";


// ======================================================
// SOCKET
// ======================================================

const SOCKET_URL =
  "bayan-production-9dd3.up.railway.app:9000";



  
const getDirection = (
  text = ""
) => {
  const rtlRegex =
    /[\u0591-\u07FF]/;

  return rtlRegex.test(text)
    ? "rtl"
    : "ltr";
};



export default function Profile() {
    const { idOtherUser } = useParams();
  const [UserDataMain, SetUserDataMain] = useState({});
  const [UserDataOther, SetUserDataOther] = useState({});
  const [editable, setEditable] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [Name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
  const [croppedArea, setCroppedArea] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [croppedImage, setCroppedImage] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [showImage, setShowImage] = useState(false);
const [FollowersNumbers, setFollowersNumbers] = useState();
const [FollowingNumbers, setFollowingNumbers] = useState();
const [FollowMode, setFollowMode] = useState();
const [followers, setFollowers] = useState(0); // 👈 كان ناقص
const [followingMap, setFollowingMap] = useState({}); // لو حابب مستقبلًا
const [likesMap, setLikesMap] = useState({}); // لكل بوست
const [feed, set_feed] = useState([]);

  const [loading, setLoading] =
    useState(false);

 // COMMENT MODAL

  const [commented, setCommented] =
    useState(false);

  // LIKES

  const [likedPosts, setLikedPosts] =
    useState({});

      const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  
    const [content, setContent] = useState("");

    const [images_Preview, setImages_Preview] = useState([]);
  const [images, setImages] = useState([]);
  const [imageToFullscreen, setImageToFullscreen] = useState(null);
  const [
    imagesPreview,
    setImagesPreview,
  ] = useState([]);


  const socketRef =
    useRef(null);

  const articleRef =
    useRef(null);

  const location =
    useLocation();

      const navigate =
    useNavigate();




//data from token

useEffect(() => {

  const storedUser = localStorage.getItem("me");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      SetUserDataMain(parsed);
      setName(parsed.name );
      setBio(parsed.Bio );
      setImageUrl(parsed.imgProfile);
      setFollowMode(true);
      if (parsed.following) {
        setFollowingNumbers(parsed.following.length)
      }
      else{
            setFollowingNumbers(0)
       }

      if (parsed.followers) {
        setFollowersNumbers(parsed.followers.length)
      }
      else{
            setFollowersNumbers(0)
       }
      
    } catch (error) {
      console.error("❌ Failed to parse user data:", error);
    }
  } else {
    console.warn("⚠️ No user data found in localStorage");
  }
}, []); 
// eslint-disable-next-line


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




useEffect(() => {


  // تحقق من أن المعرفات معرفة وصحيحة
  if (UserDataMain?.id && idOtherUser && idOtherUser !== UserDataMain.id) {
    setEditable(false);

    axios
      .post(
        "bayan-production-9dd3.up.railway.app:4000/getuser",
        { idOtherUser },
        {
          headers: {
            Authorization: "Bearer " + cookie("get"),
          },
        }
      )
      .then((res) => {
        if (res.status === 200) {
          const user = res.data.userData;

          // تعيين البيانات
          SetUserDataOther(user);
          setName(user.name);
          setBio(user.Bio || "");
          setImageUrl(user.imgProfile || "");

          // التأكد من وجود قائمة following عند المستخدم الرئيسي
          if (UserDataMain.following && Array.isArray(UserDataMain.following)) {
            if (UserDataMain.following.includes(user.id)) {
              setFollowMode(false);
            } else {
              setFollowMode(true);
            }
          } else {
            setFollowMode(true);
          }

          // عدّ المتابعين والمتابَعين
          setFollowingNumbers(user.following ? user.following.length : 0);
          setFollowersNumbers(user.followers ? user.followers.length : 0);
        }
      })
      .catch((err) => {
        console.error("❌ Update failed:", err);
      });
  }
}, [UserDataMain, idOtherUser]);


useEffect(() => {
  socketRef.current?.on("newFollower", () => {
    setFollowersNumbers(prev => (prev || 0) + 1);
  });

  socketRef.current?.on("lostFollower", () => {
    setFollowersNumbers(prev => Math.max(0, (prev || 0) - 1));
  });

  return () => {
    socketRef.current?.off("newFollower");
    socketRef.current?.off("lostFollower");
  };
}, []);











useEffect(() => {
  if (!idOtherUser) return;

  socketRef.current?.emit("MYCONTENT", {
    idUser: idOtherUser,
    type: activeTab,
  });

const handleContent = (feed) => {
  set_feed(Array.isArray(feed) ? [...feed].reverse() : []);
};

  socketRef.current?.on("CONTENT_RESULT", handleContent);

  return () => {
    socketRef.current?.off("CONTENT_RESULT", handleContent);
  };
}, [activeTab, idOtherUser]);



function followUser() {
  const storedUser = localStorage.getItem("me");
  const parsed = JSON.parse(storedUser);

  socketRef.current?.emit("followUser", {
    idUser: parsed.id,
    idFollowedUser: idOtherUser
  });
}

function unfollowUser() {
  const storedUser = localStorage.getItem("me");
  const parsed = JSON.parse(storedUser);

  socketRef.current?.emit("unfollowUser", {
    idUser: parsed.id,
    idFollowedUser: idOtherUser
  });
}

  const followingUser = async () => {
    const storedUser = localStorage.getItem("me");
      const parsed = JSON.parse(storedUser);
  axios
  .post(
      "bayan-production-9dd3.up.railway.app:4000/followingUser",
      {  IdUser: parsed.id,
    idFollowedUser:idOtherUser },
    {
        headers: {
          Authorization: "Bearer " + cookie("get"),
        },
      }
    )
    .then((res) => {
      if (res.status === 200) {
        setFollowMode(false);
        SetUserDataMain(res.data.userData);
        localStorage.setItem("me",JSON.stringify(res.data.userData))
      }
    })
    .catch((err) => {
      console.error("❌ Update failed:", err);
    });
}


  const unfollowingUser = async () => {
    const storedUser = localStorage.getItem("me");
      const parsed = JSON.parse(storedUser);
  axios
  .post(
      "bayan-production-9dd3.up.railway.app:4000/unfollowingUser",
      {  IdUser: parsed.id,
    idFollowedUser:idOtherUser },
    {
        headers: {
          Authorization: "Bearer " + cookie("get"),
        },
      }
    )
    .then((res) => {
      if (res.status === 200) {
        setFollowMode(true);
        SetUserDataMain(res.data.userData);
        localStorage.setItem("me",JSON.stringify(res.data.userData))
      }
    })
    .catch((err) => {
      console.error("❌ Update failed:", err);
    });
}


// ✅ حفظ الصورة في Firebase Storage
const saveIMG = async (imgid, base64Image) => {
  if (!base64Image) return "";

  try {
    // تحويل Base64 إلى Blob
    const response = await fetch(base64Image);
    const blob = await response.blob();

    const imageRef = storageRef(storage, `ImagesProfile/image${imgid}.jpg`);
    await uploadBytes(imageRef, blob);
    const url = await getDownloadURL(imageRef);

    return url;
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return "";
  }
};

// ✅ تحديث السيرفر
function updataWithServer(Updatable, status) {
  axios
    .post(
      "bayan-production-9dd3.up.railway.app:4000/editProfile",
      { Updatable, status },
      {
        headers: {
          Authorization: "Bearer " + cookie("get"),
        },
      }
    )
    .then((res) => {
      if (res.status === 200) {
        setName(res.data.userData.name);
        setBio(res.data.userData.Bio);
        setImageUrl(res.data.userData.imgProfile);

        localStorage.setItem("me", JSON.stringify(res.data.userData));
      }
    })
    .catch((err) => {
      console.error("❌ Update failed:", err);
    });
}


const handleCancelCropped = async () => {
    setCropMode(false);
}


  // ✅ حفظ الصورة بعد القص
  const handleSaveCropped = async () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.src = image;
  await new Promise((resolve) => (img.onload = resolve));

  canvas.width = croppedArea.width;
  canvas.height = croppedArea.height;

  ctx.drawImage(
    img,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    croppedArea.width,
    croppedArea.height
  );
  
  const base64Image = canvas.toDataURL("image/jpeg");
  setCroppedImage(base64Image);
  setCropMode(false);
  
  // ⏳ انتظر تحميل الصورة واحصل على الرابط
  const urlProfile = await saveIMG(UserDataMain.id, base64Image);
  
  // ⬆️ أرسل الرابط للسيرفر
  updataWithServer(urlProfile, "img");
};
  
  
  // -------- Handle Crop --------
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);


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
        "bayan-production-9dd3.up.railway.app:4000/saveposts",
        {
          autherID:
              JSON.parse(localStorage.getItem("me")).id,

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
  // ACTIONS
  // ======================================================

const handleLike = (item) => {
  const postId = item?.id;

  setLikesMap((prev) => {
    const isLiked = prev[postId];

    const updated = {
      ...prev,
      [postId]: !isLiked,
    };

    socketRef.current?.emit("ENGAGEMENT", {
      contentId: postId,
      userId: JSON.parse(localStorage.getItem("me")).id,
      type: isLiked ? "unlike" : "like",
    });

    return updated;
  });
};

  const handleComment = () => {
    setCommented(true);
  };

  const handleShare = async (item) => {

    try {

      if (navigator.share) {

        await navigator.share({
          title:
            item?.content ||
            "Post",

          text:
            item?.content?.slice(
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




function renderContent(item) {
  return(

          <motion.div
        key={item?.id}
        className="BottomBox"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        {/* POSTS */}



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
                  item.userData?.imgProfile || default_img}
                className="profile-pic-posts"
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
                    item.userData?.S_user
                  }
                </p>
              </div>
            </div>

            {/* IMAGE */}

            {item?.img
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
                item?.content
              )}
              onClick={() =>
                navigate(
                  `/rp/${item?.id}`,
                  {
                    state:
                      item,
                  }
                ) 
              }
              dangerouslySetInnerHTML={{
                __html:
                  item?.content ||
                  "",
              }}
            />

            {/* DATE */}

            <div className="his_Post">
              {item?.date}
            </div>
<hr/>
            {/* ACTIONS */}

            <div className="actions">
              <button
                className="like_action"
                onClick={() =>
                  handleLike(
                    item
                  )
                }
                style={{
                  color:
                    likedPosts[
                      item?.id
                    ]
                      ? "#d30000"
                      : "#333",
                }}
              >
                <FaHeart />

                <span>
                  {likesMap[item?.id] ? 1 : 0}
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
      </motion.div>
    ////////
  )
  
}

  return (<>
      <Sidebar />
      <Top />
  

    <div className="profile-container">
      {/* صورة البروفايل */}
      <div className="profile-pic-wrapper">
        <img
          src={imageUrl?imageUrl:default_img}
          alt="profile"
          className="profile-pic"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        />

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              className="dropdown-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {editable && (<label className="dropdown-item">
                <FaUserCircle />  change image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    setImage(URL.createObjectURL(e.target.files[0]));
                    setCropMode(true);
                    setDropdownOpen(false);
                  }}
                />
              </label>)}
{croppedImage || imageUrl && (
  <button className="dropdown-item" onClick={() => setShowImage(true)}>
    <FaUserCircle /> Open Image
  </button>
)}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {cropMode && (
          <motion.div
            className="crop-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            
<Cropper
  image={image}
  crop={crop}
  zoom={zoom}
  aspect={1}
  onCropChange={setCrop}
  onZoomChange={setZoom}
  onCropComplete={onCropComplete}
/>
            <button className="save-btn" onClick={handleSaveCropped}>
              <FaCheck /> Save
            </button>
            <button className="save-btn" onClick={handleCancelCropped}>
              <FaTimes /> cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>





      {/* الاسم والبايو */}
      <div className="info">
        <div className="editable">
          {editingName ? (
            <>
              <input
                value={Name}
                onChange={(e) => {setName(e.target.value)}}
              />
              <FaCheck className="icon" onClick={() =>{ updataWithServer(Name,"name");setEditingName(false)}} />
            </>
          ) : (
            <>
              <h2>{Name}</h2>
              {editable && (<FaPen className="icon" onClick={() => setEditingName(true)} />)}
            </>
          )}
        </div>

          <div className="username">{UserDataMain.username || UserDataOther.username}</div>

        <div className="editable">
          {editingBio ? (
            <>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} > </textarea>
              <FaCheck className="icon" onClick={() =>{updataWithServer(bio,"bio"); setEditingBio(false)}} />
            </>
          ) : (
            <>
              <p>{bio}</p>
              {editable && (<FaPen className="icon" onClick={() => setEditingBio(true)} />)}
            </>
          )}
        </div>
      </div>

      {!editable && (
        FollowMode?(
        <button className="follow-btn" onClick={followingUser}>
          <SlUserFollow /> Follow
        </button>) : (
            <button className="unfollow-btn" onClick={unfollowingUser}>
          <SlUserFollow /> Unfollow
      </button>
      )
        
    )}


      {/* المتابعين والمتابَعين */}
      <div className="stats">
        <div>
          <FaUserFriends /> <span>{FollowersNumbers}</span> Followers
        </div>
        <div>
          <FaUserPlus /> <span>{FollowingNumbers}</span> Following
        </div>
      </div>

      {/* Tabs */}
      
      <div className="tabs">
        {["posts","articles","novels"].map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? "active" : ""}
            whileTap={{ scale: 0.9 }}
          >
            {tab}
          </motion.button>
        ))}
      </div>
     
      {/* Tab Content */}
      <motion.div
        key={activeTab}
        className="tab-content"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {
            feed.length > 0 && (
            feed.map(
              (item) =>
                item?.content && (renderContent(item))
            )
          )
        }
      </motion.div>

      
      <AnimatePresence>
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
        src={croppedImage || imageUrl}
        alt="Profile"
        className="image-preview"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.4, type: "spring" }}
        onClick={(e) => e.stopPropagation()} // عشان ما يقفلش لما تضغط على الصورة نفسها
      />
    </motion.div>
  )}
</AnimatePresence>

    </div>

      </>
  );
}
