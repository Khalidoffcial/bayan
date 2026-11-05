/**
 * Focus Space defaults + study modes.
 * New fields are merged server-side (merge-patch write), so old saved
 * documents simply gain the defaults on next load.
 */

export const STUDY_MODES = {
  classic: { focus: 25, break: 5, label: "focus.mode.classic" },
  deep_focus: { focus: 50, break: 10, label: "focus.mode.deepFocus" },
  long_study: { focus: 90, break: 15, label: "focus.mode.longStudy" },
  custom: { focus: 25, break: 5, label: "focus.mode.custom" },
};

export const FOCUS_DEFAULTS = {
  // Background
  background: "grad-midnight",
  backgroundFit: "cover",
  backgroundAnim: true,        // animated wallpapers on/off
  bgBlur: 0,                   // px
  bgBrightness: 100,           // %
  bgContrast: 100,             // %
  bgSaturation: 100,           // %
  overlayOpacity: 55,
  brightness: 100,
  // Clock
  clockTheme: "apple",         // one of CLOCK_THEME_IDS (digital styles)
  clockType: "digital",        // digital | analog — REAL rendering switch
  clockColor: "#ffffff",
  clockSize: 40,               // % of the clock area (30–90)
  clockFont: "Inter",          // applied to digital digits + analog text
  clockFontWeight: "400",
  showSeconds: true,
  showDate: true,
  use12Hour: false,
  immersiveClock: false,       // Immersive Clock Mode (~90% viewport)
  // Tool themes (independent or unified with clock)
  unifiedToolTheme: true,
  timerTheme: "apple",
  stopwatchTheme: "apple",
  pomodoroTheme: "apple",
  // Timer behaviour
  timerPreset: 25,             // minutes (quick preset)
  timerSound: "chime",         // chime | bell | soft | none
  timerSoundVolume: 0.7,       // 0–1
  // Stopwatch
  stopwatchLaps: [],           // [{ totalMs, deltaMs, at }]
  // Pomodoro
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroSessionsBeforeLong: 4,
  // Behaviour
  soundPreferences: {},
  defaultStudyMode: "classic",
  defaultSessionDuration: 25,
  ayaNotifications: true,
  savedContentReminders: true,
  // Aya companion
  ayaEnabled: true,
  ayaIntervention: "balanced",   // gentle | balanced | active
  hideControls: false,
  musicWidgetHidden: false,     // Focus Music widget hidden (music keeps playing)
  reduceMotion: false,
  overlayVisible: true,
};

export const CLOCK_COLORS = [
  "#ffffff",
  "#0f8ee2",
  "#7dd3fc",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#a78bfa",
];

export const CLOCK_FONTS = ["Inter", "Poppins", "Cairo"];
export const CLOCK_SIZES = [32, 40, 48, 56, 72, 96];
export const CLOCK_WEIGHTS = ["300", "400", "600", "700", "800"];
export const CLOCK_STYLES = ["modern", "classic", "minimal"];

/**
 * Clock size as a PERCENT of the available clock area (not fixed px).
 * 40% = balanced default; 90% = max allowed (user request) — applied as
 * vmin-based clamp so the clock never overflows small screens.
 */
export const CLOCK_SIZE_MIN = 30;
export const CLOCK_SIZE_MAX = 90;
export const CLOCK_SIZE_DEFAULT = 40;

export const TIMER_PRESETS = [5, 10, 15, 25, 45, 60, 90];

export default FOCUS_DEFAULTS;
