import Sidebar from './compontants/sidebar.jsx';
import Content from './compontants/content';
import Top from './compontants/top.jsx';
import React, { useState, useEffect } from "react";
import cookie from "./databases/cookies_DAO.js";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import './App.css';


const HomePage = () => {
  const navigate = useNavigate();


  // 🟢 Auth check عند تحميل الصفحة
  useEffect(() => {
    axios
      .post(
        "http://192.168.1.9:4000/auth",
        {},
        {
          headers: {
            Authorization: "Bearer " + cookie("get"),
          },
        }
      )
      .then((res) => {
        if (res.status === 200) {
          navigate("/");
        }
      })
      .catch(() => {navigate("/Signin")});
  }, [navigate]);



  return (
    <div >
        {/* <Top /> */}
    <div className="homepage">
        <Content />
        <Sidebar />
    </div>
       

    </div>
  );
};

export default HomePage;
