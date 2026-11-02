import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

// تحديد اللغة التلقائي (GeoIP → المتصفح → en) أصبح جزءًا من SettingsContext
// عبر src/i18n/geoLanguage.js — لا حاجة لأي hook على مستوى App.

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
