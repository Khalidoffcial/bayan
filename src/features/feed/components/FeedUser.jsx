import React from "react";
import { useNavigate } from "react-router-dom";
import defaultImg from "../../../assets/icons/user_10374408.png";
import { ViewableAvatar } from "../../../components/common/ProfileImageViewer";

export const FeedUser = ({ userData }) => {
  const navigate = useNavigate();

  return (
    <div
      className="account"
      onClick={() => userData?.Id_user && navigate(`/p/${userData.Id_user}`)}
    >
      {/* Avatar click opens the image viewer only — stopPropagation inside
          ViewableAvatar prevents bubbling into the profile navigation. */}
      <ViewableAvatar
        src={userData?.imgProfile || ""}
        fallback={defaultImg}
        className="profile-pic-Posts"
        alt={userData?.F_user || "User"}
      />
      <div className="names">
        <h2 className="nameacc">{userData?.F_user}</h2>
        <p className="usernameacc">{userData?.S_user}</p>
      </div>
    </div>
  );
};

export default React.memo(FeedUser);
