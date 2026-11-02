import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import Content from '../components/layout/Content';
import cookie from "../utils/cookies";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import '../App.css';

export const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth check when loading the page
  useEffect(() => {
    const token = cookie("get");
    if (!token) {
      // الزائر غير المسجل → صفحة تعريفية (بما يحافظ على deep link عبر state)
      navigate("/welcome", { replace: true, state: { from: location.pathname } });
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
        navigate("/welcome", { replace: true, state: { from: location.pathname } });
      });
  }, [navigate]);

  return (
    <div>
      {/* الـ Sidebar يُعرض مرة واحدة فقط داخل Content → Feed
          — أي Sidebar ثانٍ هنا كان يسبب padding-inline-start مكرر
          ويلتصق به الـ Feed في RTL وينحرف في LTR */}
      <div className="homepage">
        <Content />
      </div>
    </div>
  );
};

export default React.memo(HomePage);

