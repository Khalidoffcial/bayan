/* eslint-disable jsx-a11y/alt-text */
import React, { useState ,useEffect} from 'react';
import '../App.css';
import ArticleBox from "./articleBox.jsx";
import user from "../icons/user_10374408.png";
import {auth} from "./firebase.js";
import { emit,on, off  } from './eventBus';
import { Link, useNavigate } from "react-router-dom";
import logo from "../icons/logo.jpeg"


const Top = () => {
    const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [User, setUser] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    emit('sendValue', searchTerm); // هذا ما سيُرسل إلى ArticleBox
  };
  const handleDelete = (e) => {
    e.preventDefault();
    setSearchTerm('');
  };

  const handleLogin = () => {
    navigate(`/p/${User.id}`)
  };

useEffect(() => {
  const storedUser = localStorage.getItem("me");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch (error) {
      console.error("❌ Failed to parse user data:", error);
    }
  } else {
    console.warn("⚠️ No user data found in localStorage");
  }
}, []); 


  return (
    <header className="top">
        <button onClick={()=>{handleLogin()}} className="login-button"> <img style={{ width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #1da1f2",
    cursor: "pointer" }}
 src={User.imgProfile || user} /></button>
{/* 
      <div className="search-container">
        <form className="wrap" onSubmit={handleSubmit}>
          <div className="search">
            <input
              type="text"
              className="searchTerm"
              placeholder="ابحث هنا"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir={navigator.language === 'ar' ? 'rtl' : 'ltr'}
            />
            <button type="submit" className="searchButton">
              
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
              </svg>
            </button>


            <button type="submit" className="delete" onClick={(e)=>{handleDelete(e)}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
            </button>
          </div>
        </form>
      </div> */}
     

      <div className="logo-center">
        {/* <div className="img"></div> */}
        <div className="company_name"><a href="/"> <img src={logo} alt="" srcset="" /> </a></div>
      </div>
      
    </header>
  );
};

export default Top;

