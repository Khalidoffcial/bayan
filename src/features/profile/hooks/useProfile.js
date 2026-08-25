import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  fetchUserProfile,
  updateUserProfileField,
  followUserApi,
  unfollowUserApi,
  uploadProfileImageBlob,
} from "../services/profile.service";
import { API_BASE_URL } from "../../../constants/apiEndpoints";

export const useProfile = () => {
  const { idOtherUser } = useParams();

  // User State
  const [userDataMain, setUserDataMain] = useState({});
  const [userDataOther, setUserDataOther] = useState({});
  const [editable, setEditable] = useState(true);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Edit State
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Crop State
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropMode, setCropMode] = useState(false);
  const [croppedArea, setCroppedArea] = useState(null);

  // Stats & Feed State
  const [activeTab, setActiveTab] = useState("Posts");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followMode, setFollowMode] = useState(true);
  const [feed, setFeed] = useState([]);
  const [likesMap, setLikesMap] = useState({});
  const [commented, setCommented] = useState(false);

  const socketRef = useRef(null);

  // 1. Initial Data Load
  useEffect(() => {
    const storedUser = localStorage.getItem("me");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserDataMain(parsed);
        if (!idOtherUser || idOtherUser === parsed.id) {
          setName(parsed.name);
          setBio(parsed.Bio || "");
          setImageUrl(parsed.imgProfile);
          setFollowingCount(parsed.following ? parsed.following.length : 0);
          setFollowersCount(parsed.followers ? parsed.followers.length : 0);
          setEditable(true);
        }
      } catch (err) {
        console.error("Parse user error:", err);
      }
    }
  }, [idOtherUser]);

  // 2. Fetch Other User Data
  useEffect(() => {
    if (userDataMain?.id && idOtherUser && idOtherUser !== userDataMain.id) {
      setEditable(false);
      fetchUserProfile(idOtherUser)
        .then((data) => {
          if (data?.userData) {
            const user = data.userData;
            setUserDataOther(user);
            setName(user.name);
            setBio(user.Bio || "");
            setImageUrl(user.imgProfile || "");
            setFollowingCount(user.following ? user.following.length : 0);
            setFollowersCount(user.followers ? user.followers.length : 0);

            if (userDataMain.following && Array.isArray(userDataMain.following)) {
              setFollowMode(!userDataMain.following.includes(user.id));
            }
          }
        })
        .catch((err) => console.error("❌ Fetch user failed:", err));
    }
  }, [userDataMain, idOtherUser]);

  // 3. Socket Setup
  useEffect(() => {
    socketRef.current = io(API_BASE_URL);

    socketRef.current.on("newFollower", () => setFollowersCount((prev) => prev + 1));
    socketRef.current.on("lostFollower", () => setFollowersCount((prev) => Math.max(0, prev - 1)));

    const handleContent = (data) => setFeed(Array.isArray(data) ? [...data].reverse() : []);
    socketRef.current.on("CONTENT_RESULT", handleContent);

    return () => socketRef.current?.disconnect();
  }, []);

  // 4. Fetch Content for Profile Tab
  useEffect(() => {
    const targetId = idOtherUser || userDataMain.id;
    if (targetId) {
      socketRef.current?.emit("MYCONTENT", { idUser: targetId, type: activeTab });
    }
  }, [activeTab, idOtherUser, userDataMain.id]);

  const handleFollow = useCallback(async () => {
    socketRef.current?.emit("followUser", { idUser: userDataMain.id, idFollowedUser: idOtherUser });
    try {
      const data = await followUserApi(userDataMain.id, idOtherUser);
      if (data?.userData) {
        setFollowMode(false);
        setUserDataMain(data.userData);
        localStorage.setItem("me", JSON.stringify(data.userData));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  }, [userDataMain.id, idOtherUser]);

  const handleUnfollow = useCallback(async () => {
    socketRef.current?.emit("unfollowUser", { idUser: userDataMain.id, idFollowedUser: idOtherUser });
    try {
      const data = await unfollowUserApi(userDataMain.id, idOtherUser);
      if (data?.userData) {
        setFollowMode(true);
        setUserDataMain(data.userData);
        localStorage.setItem("me", JSON.stringify(data.userData));
      }
    } catch (err) {
      console.error("Unfollow error:", err);
    }
  }, [userDataMain.id, idOtherUser]);

  const saveProfileUpdate = useCallback(async (value, field) => {
    try {
      const data = await updateUserProfileField(value, field);
      if (data?.userData) {
        setUserDataMain(data.userData);
        localStorage.setItem("me", JSON.stringify(data.userData));
      }
    } catch (err) {
      console.error("Profile update error:", err);
    }
  }, []);

  const handleSaveName = () => {
    setEditingName(false);
    saveProfileUpdate(name, "name");
  };

  const handleSaveBio = () => {
    setEditingBio(false);
    saveProfileUpdate(bio, "Bio");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setCropMode(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCropped = async () => {
    if (!croppedArea || !image) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = image;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
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

    setCropMode(false);

    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      const url = await uploadProfileImageBlob(blob, userDataMain.id);

      setImageUrl(url);
      saveProfileUpdate(url, "img");
    } catch (err) {
      console.error("Upload crop error:", err);
    }
  };

  const handleLike = useCallback(
    (item) => {
      const postId = item.id;
      setLikesMap((prev) => ({ ...prev, [postId]: !prev[postId] }));
      socketRef.current?.emit("ENGAGEMENT", {
        contentId: postId,
        userId: userDataMain.id,
        type: likesMap[postId] ? "unlike" : "like",
      });
    },
    [userDataMain.id, likesMap]
  );

  return {
    idOtherUser,
    userDataMain,
    userDataOther,
    editable,
    name,
    setName,
    bio,
    setBio,
    imageUrl,
    editingName,
    setEditingName,
    editingBio,
    setEditingBio,
    dropdownOpen,
    setDropdownOpen,
    image,
    crop,
    setCrop,
    zoom,
    setZoom,
    cropMode,
    setCropMode,
    setCroppedArea,
    activeTab,
    setActiveTab,
    followersCount,
    followingCount,
    followMode,
    feed,
    likesMap,
    commented,
    setCommented,
    handleFollow,
    handleUnfollow,
    handleSaveName,
    handleSaveBio,
    handleImageChange,
    handleSaveCropped,
    handleLike,
  };
};

export default useProfile;
