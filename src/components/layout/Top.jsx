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
      {/* عنصر موازٍ لزر الحساب — يحفظ اللوجو في منتصف الهيدر بغض النظر عن الاتجاه */}

      {/* اللوجو في منتصف الـ Topbar — ملف الشعار الأصلي (يتبدل مع الثيم عبر CSS) */}
      <div
        className="logo-center top-header__logo-container"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
        aria-label="Bayan Space — Home"
      >
      <div className="top-header__spacer" aria-hidden="true" />

        <div className="img top-header__logo-img" />
      </div>

      {/* أيقونة الحساب — الطرف المقابل لموضع الـ Sidebar (تتبع RTL/LTR تلقائيًا) */}
      <button
        onClick={handleProfileClick}
        className="login-button top-header__profile-btn"
        aria-label={user?.name || "User profile"}
      >
        <img
          className="top-profile-pic top-header__profile-pic"
          src={user?.imgProfile || defaultUserIcon}
          alt={user?.name || "Profile"}
        />
      </button>
    </header>
  );
};

export default React.memo(Top);

