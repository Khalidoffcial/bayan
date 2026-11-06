import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
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

  // AppLayout owns the chrome + workspace + ad rail; the homepage composes
  // its own content (Spotlight hero + Feed) inside the shared column.
  return (
    <AppLayout>
      <Content />
    </AppLayout>
  );
};

export default React.memo(HomePage);
