import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from '../components/layout/Sidebar';
import Content from '../components/layout/Content';
import cookie from "../utils/cookies";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import '../App.css';

export const HomePage = () => {
  const navigate = useNavigate();

  // Auth check when loading the page
  useEffect(() => {
    const token = cookie("get");
    if (!token) {
      navigate("/signin");
      return;
    }

    axios
      .post(
        API_ENDPOINTS.AUTH,
        {},
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      )
      .then((res) => {
        if (res.status === 200 && res.data?.userData) {
          localStorage.setItem("me", JSON.stringify(res.data.userData));
        }
      })
      .catch(() => {
        navigate("/signin");
      });
  }, [navigate]);

  return (
    <div>
      <div className="homepage">
        <Content />
        <Sidebar />
      </div>
    </div>
  );
};

export default React.memo(HomePage);

