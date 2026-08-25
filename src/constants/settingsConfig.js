export const THEMES = [
  { id: "light", icon: "☀️", label: "Light", desc: "Clean & bright" },
  { id: "dark", icon: "🌑", label: "Dark", desc: "Easy on eyes" },
  { id: "system", icon: "💻", label: "System", desc: "Matches OS" },
];

export const FONT_SIZES = ["Small", "Medium", "Large"];

export const FONT_FAMILIES = [
  { id: "Inter", sample: "Aa", desc: "Modern & clean" },
  { id: "Poppins", sample: "Aa", desc: "Rounded & friendly" },
  { id: "Cairo", sample: "أأ", desc: "Arabic support" },
];

export const LANGUAGES = [
  { id: "en", flag: "🇺🇸", name: "English", native: "English", dir: "ltr" },
  { id: "ar", flag: "🇸🇦", name: "Arabic", native: "العربية", dir: "rtl" },
];

export const NOTIFICATION_ITEMS = [
  { key: "likes", label: "Likes", desc: "When someone likes your posts or articles" },
  { key: "comments", label: "Comments", desc: "When someone comments on your content" },
  { key: "followers", label: "New Followers", desc: "When someone follows you on Bayan" },
  { key: "newArticles", label: "New Articles in Spaces", desc: "When creators you follow publish new content" },
  { key: "newIdeas", label: "New Ideas", desc: "New idea cards in Spaces you're part of" },
  { key: "emailNotifications", label: "Email Notifications", desc: "Receive a digest of activity via email" },
];

export const READING_TOGGLES = [
  { key: "focusMode", label: "Focus Mode", desc: "Hide sidebar and distractions while reading" },
  { key: "hideLikeCounts", label: "Hide Like Counts", desc: "Reduce social pressure, see only your own likes" },
  { key: "hideNotificationsWhileReading", label: "Silence Notifications While Reading", desc: "Block notification badges during reading sessions" },
  { key: "minimalUI", label: "Minimal UI", desc: "Strip down the interface to content only" },
  { key: "autoReadingMode", label: "Auto Reading Mode", desc: "Automatically enter focus when you open an article" },
];

export const READING_GOALS = [
  { value: 15, label: "Quick read" },
  { value: 30, label: "Daily habit" },
  { value: 60, label: "Deep work" },
];

export const CREATOR_TOGGLES = [
  { key: "allowComments", label: "Allow Comments", desc: "Readers can leave comments on your content" },
  { key: "showAnalytics", label: "Show Analytics", desc: "Display view and engagement counts publicly" },
  { key: "publicAuthorProfile", label: "Public Author Profile", desc: "Your profile is visible in the Explore section" },
  { key: "allowMessages", label: "Allow Direct Messages", desc: "Readers can send you private messages" },
];
