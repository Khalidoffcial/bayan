import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { fetchUserSettings, updateUserSettings } from "../services/settings.service";

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState(null);

  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [language, setLanguage] = useState("en");

  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    followers: true,
    newArticles: false,
    newIdeas: true,
    emailNotifications: false,
  });

  const [reading, setReading] = useState({
    focusMode: false,
    hideLikeCounts: false,
    hideNotificationsWhileReading: true,
    minimalUI: false,
    autoReadingMode: false,
    readingGoal: 30,
  });

  const [creator, setCreator] = useState({
    allowComments: true,
    showAnalytics: true,
    publicAuthorProfile: true,
    allowMessages: false,
  });

  const [profile, setProfile] = useState({
    name: "",
    username: "",
    email: "",
    avatar: null,
  });

  const [saveStatus, setSaveStatus] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUserSettings();
      if (!data) return;

      setSettingsId(data._id);

      setTheme(data.appearance?.theme || "light");
      setFontSize(data.appearance?.fontSize || "medium");
      setFontFamily(data.appearance?.fontFamily || "Inter");
      setLanguage(data.appearance?.language || "en");

      setNotifications(
        data.notifications || {
          likes: true,
          comments: true,
          followers: true,
          newArticles: false,
          newIdeas: true,
          emailNotifications: false,
        }
      );

      setReading(
        data.reading || {
          focusMode: false,
          hideLikeCounts: false,
          hideNotificationsWhileReading: true,
          minimalUI: false,
          autoReadingMode: false,
          readingGoal: 30,
        }
      );

      setCreator(
        data.creator || {
          allowComments: true,
          showAnalytics: true,
          publicAuthorProfile: true,
          allowMessages: false,
        }
      );

      setProfile(
        data.profile || {
          name: "",
          username: "",
          email: "",
          avatar: null,
        }
      );
    } catch (error) {
      console.error("Load settings error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (loading) return;

    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-font-size", fontSize);
    document.documentElement.style.setProperty(
      "--font-primary",
      `${fontFamily}, sans-serif`
    );
    document.documentElement.setAttribute(
      "dir",
      language === "ar" ? "rtl" : "ltr"
    );
  }, [theme, fontSize, fontFamily, language, loading]);

  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }, 900);
  }, []);

  const settingsData = useMemo(
    () => ({
      appearance: {
        theme,
        fontSize,
        fontFamily,
        language,
        direction: language === "ar" ? "rtl" : "ltr",
      },
      profile,
      notifications,
      reading,
      creator,
      updatedAt: new Date().toISOString(),
    }),
    [theme, fontSize, fontFamily, language, profile, notifications, reading, creator]
  );

  const saveSettings = useCallback(async () => {
    try {
      triggerSave();
      const result = await updateUserSettings(settingsData);
      if (!settingsId && result?._id) {
        setSettingsId(result._id);
      }
      return result;
    } catch (error) {
      console.error("Save settings error:", error);
      throw error;
    }
  }, [settingsData, settingsId, triggerSave]);

  const value = useMemo(
    () => ({
      loading,
      theme,
      setTheme,
      fontSize,
      setFontSize,
      fontFamily,
      setFontFamily,
      language,
      setLanguage,
      notifications,
      setNotifications,
      reading,
      setReading,
      creator,
      setCreator,
      profile,
      setProfile,
      settingsId,
      saveStatus,
      settingsData,
      triggerSave,
      saveSettings,
      loadSettings,
    }),
    [
      loading,
      theme,
      fontSize,
      fontFamily,
      language,
      notifications,
      reading,
      creator,
      profile,
      settingsId,
      saveStatus,
      settingsData,
      triggerSave,
      saveSettings,
      loadSettings,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
