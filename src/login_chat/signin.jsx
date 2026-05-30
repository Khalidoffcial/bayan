import React, { useState, useEffect } from "react";
// import "./login.module.css";
import cookie from "../databases/cookies_DAO.js";
import nextIcon from "../icons/next.png";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import earth from "../image/image0.svg";
import { auth, googleProvider } from "./firebase.js";
import { signInWithPopup } from "firebase/auth";

function Login() {
  const navigate = useNavigate();

  // States
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Auto Auth when token exists
  useEffect(() => {
    axios
      .post(
        "http://bayan.railway.internal:4000/auth",
        {},
        {
          headers: {
            Authorization: "Bearer " + cookie("get"),
          },
        }
      )
      .then((res) => {
        if (res.status === 200) {
          localStorage.setItem("me", JSON.stringify(res.data.userData));
          navigate("/");
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Handlers
  const handleLogin = () => {
    const url = "http://bayan.railway.internal:4000/signin";
    const data = { identifierUser: username, password };

    axios
      .post(url, data, { headers: { "Content-Type": "application/json" } })
      .then((res) => {
        const accessToken = res.data.accessToken;

        localStorage.setItem("me", JSON.stringify(res.data.userData));

        if (rememberMe) {
          cookie(accessToken);
        } else {
          localStorage.setItem("token", accessToken);
        }

        navigate("/");
      })
      .catch((err) => console.error("Login error:", err));
  };

  
  const handleGoogleLogin = async () => {
    try {

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const data = {
        email: user.email,
        uid: user.uid,
      };


      const url = "http://bayan.railway.internal:4000/auth/google";

      axios
      .post(url, data, { headers: { "Content-Type": "application/json" } })
      .then((res) => {
        if (res.data && res.status === 200) {
          
          const accessToken = res.data.accessToken;
          
        localStorage.setItem("me", JSON.stringify(res.data.userData));

        if (rememberMe) {
          cookie(accessToken);
        } else {
          localStorage.setItem("token", accessToken);
        }

        navigate("/");
      }else{
        

      }
      })
      .catch((err) => console.error("Login error:", err));




    } catch (err) {
      console.error("Google login error:", err);
    }
  };


  return (
    <div className="log-page">
      
      {/* Background Image */}
      <img className="background" src={earth} alt="background" />

      {/* LOGIN BOX */}
      <div className="signup-box">
        <h2>Bayan</h2>
        <h6>Login</h6>

        {/* Username */}
        <div className="user-box">
          <input
            type="text"
            placeholder="Username"
            autoComplete="off"
            autofill="false"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="user-box">
          <input
            type="password"
            placeholder="Enter password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Google */}
       <button
          type="button"
          className="login_with_google_btn"
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </button>

        {/* Remember Me */}
        <div className="checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label>Remember Me</label>
        </div>

        {/* Buttons */}
        <div className="sign">
          <Link to="/Signup" className="signin">
            I don’t have an account
          </Link>

          <button className="signup" onClick={handleLogin}>
            <h1>Sign in</h1>
            <img src={nextIcon} alt="next" className="img_next" />
          </button>
        </div>
      </div>

    </div>
  );
}

export default Login;
