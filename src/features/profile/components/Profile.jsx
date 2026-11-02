import React, { useState, useEffect, useRef } from "react";
import Top from "../../../components/layout/Top";
import Sidebar from "../../../components/layout/Sidebar";

import ProfileHeader from "./ProfileHeader";
import ProfileInfo from "./ProfileInfo";
import ProfileStats from "./ProfileStats";
import ProfileTabs from "./ProfileTabs";
import ProfileContent from "./ProfileContent";
import ProfileEditModal from "./ProfileEditModal";

import useProfile from "../hooks/useProfile";
import useProfileContent from "../hooks/useProfileContent";
import { profileContentStore } from "../services/profileContentStore";
import { getDirection } from "../../../utils/helpers";
import { useToast } from "../../../components/ui/Toast";
import "../styles/profile.css";
// Cards rendered by ProfileContent (PostCard/ArticleCard/ReplyCard) reuse the
// feed stylesheet classes (.container_post, .content_Post, .box, ...). Those
// styles live in feed.css which is bundled ONLY with Feed.jsx — without this
// import, a direct load / refresh of the profile page renders unstyled cards
// until the feed bundle is visited once.
import "../../feed/styles/feed.css";

export const Profile = () => {
  const toast = useToast();
  // Inline comments: single expanded section at a time (null = all collapsed).
  const [activeCommentId, setActiveCommentId] = useState(null);
  const {
    idOtherUser,
    userDataMain,
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
    savingField,
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
    followersCount,
    followingCount,
    followMode,
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
  } = useProfile();

  // Unified content feed: posts + replies + articles + novels for the
  // profile owner (NOT the currently logged-in user).
  const contentProfileId = idOtherUser || userDataMain?.id || "";
  const {
    items,
    counts,
    activeTab,
    setActiveTab,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  } = useProfileContent(contentProfileId);

  const handleComment = (postId) =>
    setActiveCommentId((prev) => (prev === postId ? null : postId));

  // Scroll restoration per (profile, tab): save while mounted, restore after
  // the cached items render — one restore per mount, never before the layout
  // is tall enough (no visual jumping, no clamping to a short document).
  const didRestoreScroll = useRef(false);

  useEffect(() => {
    didRestoreScroll.current = false;
    const save = () => profileContentStore.setScroll(contentProfileId, activeTab, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [contentProfileId, activeTab]);

  useEffect(() => {
    if (didRestoreScroll.current) return;
    const savedY = profileContentStore.getScroll(contentProfileId, activeTab);
    if (!savedY) return;

    const raf = requestAnimationFrame(() => {
      if (document.documentElement.scrollHeight > savedY + window.innerHeight) {
        window.scrollTo({ top: savedY, behavior: "instant" });
        didRestoreScroll.current = true;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [contentProfileId, activeTab, items]);

  // حفظ البايو/الاسم مع رسالة نجاح أو خطأ مفهومة
  const handleSaveBioWithFeedback = async () => {
    const res = await handleSaveBio();
    if (res?.ok) toast.success("تم حفظ البايو");
    else if (res?.error) toast.error(res.error);
  };

  const handleSaveNameWithFeedback = async () => {
    const res = await handleSaveName();
    if (res?.ok) toast.success("تم حفظ الاسم");
    else if (res?.error) toast.error(res.error);
  };

  const handleShare = (item) =>
    navigator.share &&
    navigator.share({ title: item.content || item.title, url: window.location.href });

  return (
    <div className="profile-container">
      <Top />
      <Sidebar />

      <div className="profile-content">
        <ProfileHeader
          imageUrl={imageUrl}
          editable={editable}
          onImageClick={() => editable && setDropdownOpen(!dropdownOpen)}
          onDropdownToggle={(action) => {
            setDropdownOpen(false);
            if (action === "change") document.getElementById("profile-upload").click();
          }}
          dropdownOpen={dropdownOpen}
        />
        <input id="profile-upload" type="file" hidden onChange={handleImageChange} />

        <ProfileInfo
          name={name}
          bio={bio}
          editable={editable}
          editingName={editingName}
          editingBio={editingBio}
          onEditName={() => setEditingName(true)}
          onEditBio={() => setEditingBio(true)}
          onSaveName={handleSaveNameWithFeedback}
          onSaveBio={handleSaveBioWithFeedback}
          setName={setName}
          setBio={setBio}
          savingField={savingField}
          followMode={followMode}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />

        <ProfileStats followers={followersCount} following={followingCount} />

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        <div className="profile-feed">
          <ProfileContent
            items={items}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRetry={retry}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            likedPosts={likesMap}
            getDirection={getDirection}
            userId={userDataMain?.id}
            activeCommentId={activeCommentId}
          />
        </div>
      </div>

      {cropMode && (
        <ProfileEditModal
          image={image}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, area) => setCroppedArea(area)}
          onSave={handleSaveCropped}
          onCancel={() => setCropMode(false)}
        />
      )}
    </div>
  );
};

export default React.memo(Profile);
