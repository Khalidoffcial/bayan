import React from "react";
import { Helmet } from "react-helmet-async";
import defaultImg from "../../../assets/icons/user_10374408.png";
import { ViewableAvatar } from "../../../components/common/ProfileImageViewer";

export const PostHeader = ({ userData, imageUrl }) => {
  return (
    <>
      <Helmet>
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="post" />
        <meta name="twitter:card" content="summary_large_image" />
        {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      </Helmet>

      <div className="post-user-info">
        <ViewableAvatar
          src={userData?.imgProfile || ""}
          fallback={defaultImg}
          className="post-profile-pic"
          alt={userData?.F_user || "User"}
        />
        <div className="post-user-names">
          <h2 className="post-name">{userData?.F_user}</h2>
          <p className="post-username">{userData?.S_user}</p>
        </div>
      </div>
    </>
  );
};

export default React.memo(PostHeader);
