import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AudioProvider } from "./features/audio/AudioContext";
import { AudioLibraryProvider } from "./features/audio/AudioLibraryProvider";
import AudioShell from "./features/audio/AudioShell";
import "./App.css";

// تحديد اللغة التلقائي (GeoIP → المتصفح → en) أصبح جزءًا من SettingsContext
// عبر src/i18n/geoLanguage.js — لا حاجة لأي hook على مستوى App.

function App() {
  return (
    <BrowserRouter>
      {/* المحرك الصوتي خارج الراوتر — التشغيل يستمر عند التنقل بين الصفحات */}
      {/* AudioLibraryProvider يجب أن يغلف AudioProvider: المحرك يستهلك
          useAudioLibrary() لتسجيل الاستماع وحفظ التقدم — وبدونه lib === null */}
      <AudioLibraryProvider>
        <AudioProvider>
          <AppRoutes />
          <AudioShell />
        </AudioProvider>
      </AudioLibraryProvider>
    </BrowserRouter>
  );
}

export default App;
