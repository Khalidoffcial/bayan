import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./homepage.jsx";

import ArticleBox from "./components/articleBox.jsx";
import Profile from "./components/profile.jsx";
import Articlereading from "./components/articlereading.jsx";
import Postreading from "./components/postreading.jsx";

import Signup from "./login_chat/signup.jsx";
import Login from "./login_chat/signin.jsx";

import Settings from "./pages/Settings.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/signin" element={<Login />} />

        <Route path="/settings" element={<Settings />} />

        <Route path="/p/:idOtherUser" element={<Profile />} />

        <Route path="/:typeArticle" element={<ArticleBox />} />

        <Route path="/r/:articleId" element={<Articlereading />} />

        <Route path="/rp/:postId" element={<Postreading />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;