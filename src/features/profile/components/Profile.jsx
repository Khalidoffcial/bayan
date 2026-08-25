import React from "react";
import Top from "../../../components/layout/Top";
import Sidebar from "../../../components/layout/Sidebar";
import CommentModal from "../../../components/common/CommentModal";
import FeedList from "../../feed/components/FeedList";

import ProfileHeader from "./ProfileHeader";
import ProfileInfo from "./ProfileInfo";
import ProfileStats from "./ProfileStats";
import ProfileTabs from "./ProfileTabs";
import ProfileEditModal from "./ProfileEditModal";

import useProfile from "../hooks/useProfile";
import { getDirection } from "../../../utils/helpers";
import "../styles/profile.css";

export const Profile = () => {
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
  } = useProfile();

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
          onSaveName={handleSaveName}
          onSaveBio={handleSaveBio}
          setName={setName}
          setBio={setBio}
          followMode={followMode}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />

        <ProfileStats followers={followersCount} following={followingCount} />

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="profile-feed">
          <FeedList
            feed={feed}
            likedPosts={likesMap}
            likesCount={likesMap}
            onLike={handleLike}
            onComment={() => setCommented(true)}
            onShare={(item) =>
              navigator.share &&
              navigator.share({ title: item.content, url: window.location.href })
            }
            getDirection={getDirection}
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

      <CommentModal
        isOpen={commented}
        onClose={() => setCommented(false)}
        commentOnId={idOtherUser || userDataMain.id}
        userId={userDataMain.id}
      />
    </div>
  );
};

export default React.memo(Profile);
