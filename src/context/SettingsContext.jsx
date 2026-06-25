import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

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


  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `https://bayan-production-9dd3.up.railway.app/settings`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

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
  };

  useEffect(() => {
    loadSettings();
  }, []);

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

  const triggerSave = () => {
    setSaveStatus("saving");

    setTimeout(() => {
      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }, 900);
  };

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
    [
      theme,
      fontSize,
      fontFamily,
      language,
      profile,
      notifications,
      reading,
      creator,
    ]
  );

  const saveSettings = async () => {
    try {
      triggerSave();

      const endpoint = `https://bayan-production-9dd3.up.railway.app/settings`;

      const method =  "PUT";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (!settingsId && result?._id) {
        setSettingsId(result._id);
      }

      return result;
    } catch (error) {
      console.error("Save settings error:", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};