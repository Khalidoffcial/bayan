import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { fetchUserSettings, updateUserSettings } from "../services/settings.service";
import cookie from "../utils/cookies";
import { DEFAULT_PRIMARY } from "../constants/primaryColors";
import { isRtlLanguage, LANGUAGES } from "../constants/settingsConfig";
import { resolveLanguage } from "../i18n/geoLanguage";

const SettingsContext = createContext(null);

// تحويل لون hex إلى HSL — لتوليد درجات اللون الأساسي
const hexToHsl = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return { h: 224, s: 100, l: 64 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

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
  // اللغة تبدأ من localStorage (كتبها index.html والسياق عند كل تغيير) —
  // الزائر غير المسجل يحصل على لغته فورًا، والمسجل يستوردها من السيرفر بعدها.
  const [language, setLanguageState] = useState(() => localStorage.getItem("language") || "en");
  // setLanguage المركزي — لا يقبل إلا لغة مدعومة، ويحفظ الاختيار اليدوي فورًا.
  const setLanguage = useCallback((id) => {
    if (!LANGUAGES.some((l) => l.id === id)) return;
    localStorage.setItem("language", id);
    setLanguageState(id);
  }, []);
  // أول زيارة بلا اختيار محفوظ: GeoIP → المتصفح → en (لا يحجب الرسم؛
  // يُشغَّل قبل التأثير الأول ويحدّث الحالة فور توفر النتيجة).
  // تجاهل الاختيار المؤقت المكتوب بذاته في زيارة سابقة عبر "auto" — غير مستخدم الآن.
  useEffect(() => {
    const saved = localStorage.getItem("language");
    if (saved) return;
    let alive = true;
    resolveLanguage({
      onResolved: (lang) => {
        if (alive) setLanguageState(lang);
      },
    });
    return () => { alive = false; };
  }, []);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);

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
    const token = cookie("get");
    // If unauthenticated / no token, do not make an unauthorized request to protected /settings
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchUserSettings();
      if (!data) return;

      setSettingsId(data._id);

      setTheme(data.appearance?.theme || "light");
      setFontSize(data.appearance?.fontSize || "medium");
      setFontFamily(data.appearance?.fontFamily || "Inter");
      // السيرفر هو مصدر الحقيقة للمسجل — لكن نحترم قيمة الزائر إن لم توجد في السيرفر
      setLanguageState(data.appearance?.language || localStorage.getItem("language") || "en");
      setPrimaryColor(
        /^#[0-9a-fA-F]{6}$/.test(data.appearance?.primaryColor || "")
          ? data.appearance.primaryColor
          : DEFAULT_PRIMARY
      );

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
      // If 401 Unauthorized (expired/invalid token), clean up stale session token gracefully
      if (error?.response?.status === 401) {
        cookie("remove");
      } else {
        console.error("Load settings error:", error);
      }
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
    // theme: دعم "system" عبر matchMedia
    const applyTheme = (t) => {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved =
        t === "dark" || (t === "system" && prefersDark)
          ? "dark"
          : "light";
      document.documentElement.setAttribute("data-theme", resolved);
    };
    applyTheme(theme);

    let removeMqListener = null;
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystemChange = () => {
        if (theme === "system") applyTheme("system");
      };
      mq.addEventListener("change", onSystemChange);
      removeMqListener = () => mq.removeEventListener("change", onSystemChange);
    }

    // اتجاه الواجهة مشتق من اللغة المختارة عبر isRtlLanguage (خريطة LANGUAGES)
    // — يُطبق على documentElement و body معًا لمنع أي تعارض بينهما.
    const dir = isRtlLanguage(language) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
    document.body.setAttribute("dir", dir);
    // حفظ اللغة للمزامنة الأولى في index.html (يمنع وميض RTL قبل الرسم)
    // — السياق هو المصدر؛ الاختيار اليدوي حُفظ في setLanguage.
    try {
      localStorage.setItem("language", language);
    } catch (e) {
      /* التخزين غير متاح — لا يؤثر على عمل الاتجاه */
    }

    // اللون الأساسي + درجاته المولدة — ينعكس على كل الصفحات.
    // ملاحظة: --blue و --teal هما المتغيران المستخدمان فعليًا في الأزرار والروابط
    // والتوجل والعناصر النشطة في كل الموقع، لذا يجب تحديثهما مع اللون المختار.
    const { h, s, l } = hexToHsl(primaryColor);
    const root = document.documentElement.style;
    root.setProperty("--primary-color", primaryColor);
    root.setProperty("--primary-hover", `hsl(${h} ${s}% ${Math.max(l - 8, 20)}%)`);
    root.setProperty("--primary-dim", `hsl(${h} ${s}% ${l}% / 0.14)`);
    root.setProperty("--primary-border", `hsl(${h} ${s}% ${l}% / 0.22)`);
    root.setProperty("--accent-color", `hsl(${h} ${Math.max(s - 10, 30)}% ${Math.min(l + 12, 82)}%)`);
    // ربط اللون المختار بالمتغيرات الحقيقية المستخدمة في بقية الموقع
    root.setProperty("--blue", primaryColor);
    root.setProperty("--blue-dim", `hsl(${h} ${s}% ${l}% / 0.3)`);
    root.setProperty("--blue-border", `hsl(${h} ${s}% ${l}% / 0.11)`);
    root.setProperty("--teal", primaryColor);
    root.setProperty("--teal-dim", `hsl(${h} ${s}% ${l}% / 0.12)`);

    return () => {
      if (removeMqListener) removeMqListener();
    };
  }, [theme, fontSize, fontFamily, language, primaryColor, loading]);

  // حفظ مُؤجّل (debounce) — يتجنب طلبًا لكل تغيير، ويعرض حالة فشل واضحة
  const saveTimerRef = useRef(null);
  const settingsData = useMemo(
    () => ({
      appearance: {
        theme,
        fontSize,
        fontFamily,
        language,
        primaryColor,
        direction: isRtlLanguage(language) ? "rtl" : "ltr",
      },
      profile,
      notifications,
      reading,
      creator,
      updatedAt: new Date().toISOString(),
    }),
    [theme, fontSize, fontFamily, language, primaryColor, profile, notifications, reading, creator]
  );
  // مرجع حي لأحدث قيم الإعدادات — لضمان أن الحفظ الفوري يستخدم آخر تعديل
  const settingsDataRef = useRef(settingsData);
  settingsDataRef.current = settingsData;

  const saveSettingsDebounced = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const result = await updateUserSettings(settingsDataRef.current);
        if (!settingsId && result?._id) setSettingsId(result._id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? null : s)), 2500);
      } catch (error) {
        console.error("Save settings error:", error);
        setSaveStatus("failed");
        // الاحتفاظ بحالة failed ظاهرة حتى يعيد المستخدم المحاولة
      }
    }, 900);
  }, [settingsId]);

  // حفظ فوري عند مغادرة الصفحة — يمنع فقدان آخر تعديل بسبب debounce
  useEffect(() => {
    const flushOnLeave = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (navigator.sendBeacon && cookie("get")) {
          try {
            navigator.sendBeacon(
              "/settings",
              new Blob([JSON.stringify(settingsDataRef.current)], { type: "application/json" })
            );
          } catch (e) {
            /* ignore */
          }
        }
      }
    };
    window.addEventListener("pagehide", flushOnLeave);
    return () => window.removeEventListener("pagehide", flushOnLeave);
  }, []);

  // triggerSave يحتفظ باسمه القديم للتوافق مع المكوّنات الموجودة
  const triggerSave = saveSettingsDebounced;

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
      primaryColor,
      setPrimaryColor,
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
      primaryColor,
      saveSettings,
      loadSettings,
      setLanguage,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
