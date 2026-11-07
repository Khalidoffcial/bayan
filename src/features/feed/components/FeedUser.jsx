import React from "react";
import { useNavigate } from "react-router-dom";
import defaultImg from "../../../assets/icons/user_10374408.png";
import { ViewableAvatar } from "../../../components/common/ProfileImageViewer";

/**
 * FeedUser — the author identity row.
 * variant "card": compact inline head used by the new content cards.
 * (Default variant preserved for other callers.)
 */
export const FeedUser = ({ userData, variant }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`account ${variant === "card" ? "bcard-author" : ""}`}
      onClick={() => userData?.Id_user && navigate(`/p/${userData.Id_user}`)}
    >
      <ViewableAvatar
        src={userData?.imgProfile || ""}
        fallback={defaultImg}
        className={variant === "card" ? "bcard-avatar" : "profile-pic-Posts"}
        alt={userData?.F_user || "User"}
      />
      <div className={variant === "card" ? "bcard-names" : "names"}>
        <h2 className={variant === "card" ? "bcard-name" : "nameacc"}>{userData?.F_user}</h2>
        <p className={variant === "card" ? "bcard-username" : "usernameacc"}>{userData?.S_user}</p>
      </div>
    </div>
  );
};

export default React.memo(FeedUser);
