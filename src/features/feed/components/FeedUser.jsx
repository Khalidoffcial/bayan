import React from "react";
import { useNavigate } from "react-router-dom";
import defaultImg from "../../../assets/icons/user_10374408.png";

export const FeedUser = ({ userData }) => {
  const navigate = useNavigate();

  return (
    <div
      className="account"
      onClick={() => userData?.Id_user && navigate(`/p/${userData.Id_user}`)}
    >
      <img
        src={userData?.imgProfile || defaultImg}
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
