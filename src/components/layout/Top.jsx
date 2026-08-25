import React from 'react';
import { useNavigate } from "react-router-dom";
import useAuth from '../../hooks/useAuth';
import defaultUserIcon from "../../assets/icons/user_10374408.png";
import "./styles/top.css";

const Top = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProfileClick = () => {
    if (user?.id) {
      navigate(`/p/${user.id}`);
    } else {
      navigate('/signin');
    }
  };

  return (
    <header className="top top-header">
      <button
        onClick={handleProfileClick}
        className="login-button top-header__profile-btn"
        aria-label="User profile"
      >
        <img
          className="top-profile-pic top-header__profile-pic"
          src={user?.imgProfile || defaultUserIcon}
          alt={user?.name || "Profile"}
        />
      </button>

      <div className="logo-center top-header__logo-container">
        <div
          className="img top-header__logo-img"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          aria-label="Home"
        />
      </div>
    </header>
  );
};

export default React.memo(Top);

