/**
 * focusIcons — the central Lucide icon registry for Bayan Space.
 *
 * This replaces the old asset-based icon system (PNG/SVG files from
 * src/assets/icons) with the professional Lucide React library. The
 * library is bundled with the build (no external downloads at runtime).
 *
 * Conventions:
 *  - Default size 20; importance-based sizing via the `size` prop.
 *  - Unified strokeWidth 1.75 across the platform.
 *  - Neutral colors by default; the brand blue #0f8ee2 only for active
 *    states (CSS class on the wrapper button, not an inline color).
 *  - RTL/LTR: directional icons (angles/arrows) are NOT auto-flipped —
 *    the few that need flipping get an explicit `data-flip` attribute
 *    handled in CSS.
 *  - Accessibility: every icon-only usage carries an aria-label via the
 *    consuming button; components here export plain Lucide glyphs.
 *
 * Performance: Lucide icons are imported INDIVIDUALLY (named imports) —
 * CRA tree-shakes the ESM build, so only the used glyphs ship in the
 * bundle, not the full library.
 */
import {
  // Navigation / sidebar
  LayoutDashboard,
  FileText,
  BookOpen,
  GraduationCap,
  Focus,
  Settings2,
  Menu,
  Info,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  Library,

  // Focus Space rail
  AudioLines,
  NotebookPen,
  ListTodo,
  Sparkles,
  Moon,
  Bell,
  SlidersHorizontal,

  // Clock / timer / pomodoro
  Clock,
  Timer,
  TimerReset,
  Play,
  Pause,
  Square,
  Repeat,
  RefreshCw,

  // Sounds
  Volume2,
  VolumeX,
  Waves,
  Music,
  Shuffle,
  StepBack,
  StepForward,

  // Quran / Aya
  BookOpenCheck,
  MoonStar,

  // Saved content / notes / tasks
  Bookmark,
  Check,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Pin,

  // Backgrounds
  Image,
  ImagePlus,
  Upload,

  // Notifications
  Flag,

  // Misc UI
  X,
  Search,
  Share2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ExternalLink,
  History,
} from "lucide-react";

export {
  // Navigation / sidebar
  LayoutDashboard as AllIcon,
  FileText as ArticleIcon,
  BookOpen as NovelIcon,
  GraduationCap as ExamIcon,
  Focus as FocusIcon,
  Settings2 as SettingsIcon,
  Menu as MenuIcon,

  // Focus Space rail
  AudioLines as SoundsIcon,
  NotebookPen as NotesIcon,
  ListTodo as TasksIcon,
  Sparkles as SmartIcon,
  Moon as AyaIcon,
  Bell as NotificationsIcon,
  SlidersHorizontal as SpaceSettingsIcon,

  // Clock / timer / pomodoro
  Clock as ClockIcon,
  Timer as TimerIcon,
  TimerReset as StopwatchIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Square as StopIcon,
  Repeat as LoopIcon,
  RefreshCw as RetryIcon,

  // Sounds
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
  Waves as NatureIcon,
  Shuffle as ShuffleIcon,

  // Quran / Aya
  BookOpenCheck as QuranIcon,
  Music as MusicIcon,
  MoonStar as MoonStarIcon,

  // Saved content / notes / tasks
  Bookmark as BookmarkIcon,
  Check as CheckIcon,
  Plus as PlusIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
  Link2 as LinkIcon,
  Pin as PinIcon,
  StepForward as SkipIcon,
  StepBack as SkipBackwardIcon,
  StepForward as SkipForwardIcon,

  // Backgrounds
  Image as ImageIcon,
  ImagePlus as ImagePlusIcon,
  Upload as UploadIcon,

  // Notifications
  Flag as FlagIcon,
  Bell as BellIcon,


  // Misc UI
  X as CloseIcon,
  Search as SearchIcon,
  MoreVertical as MoreVerticalIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ArrowLeft as ArrowLeftIcon,
  ExternalLink as ExternalLinkIcon,
  History as HistoryIcon,
  Share2 as ShareIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Maximize as MaximizeIcon,
  Library as LibraryIcon,
  BookOpen as BookOpenIcon,
  Info as InfoIcon,

  // (raw, for consumers that need the unaliased glyph)
  LayoutDashboard,
  FileText,
  BookOpen,
  GraduationCap,
  Focus,
  Settings2,
  Menu,
  AudioLines,
  NotebookPen,
  ListTodo,
  Sparkles,
  Moon,
  Bell,
  SlidersHorizontal,
  Clock,
  Timer,
  TimerReset,
  Play,
  Pause,
  Square,
  Repeat,
  RefreshCw,
  Volume2,
  VolumeX,
  BookOpenCheck,
  MoonStar,
  Bookmark,
  Check,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Pin,
  StepForward,
  Image,
  ImagePlus,
  Upload,
  Flag,
  X,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
};

/**
 * Rail buttons — one Lucide glyph per panel. Components are passed
 * directly (Lucide renders its own <svg>), so no <img> is involved and
 * the brand blue applies via CSS `color` on the wrapper.
 */
export const RAIL_ICONS = {
  sounds: AudioLines,
  backgrounds: Image,
  notes: NotebookPen,
  tasks: ListTodo,
  smart: Sparkles,
  aya: Moon,
  notifications: Bell,
  settings: SlidersHorizontal,
};

/** Nav channels — one Lucide glyph per sidebar link. */
export const NAV_ICONS = {
  all: LayoutDashboard,
  posts: FileText,
  articles: BookOpen,
  novels: BookOpenCheck,
  books: Library,
  exams: GraduationCap,
  focus: Focus,
  settings: Settings2,
};

/** Misc UI icons reused inside panels (plain glyphs). */
export const PANEL_ICONS = {
  smiley: MoonStar,
  task: ListTodo,
  bullseye: Focus,
  search: Search,
  close: X,
  bookmark: Bookmark,
  check: Check,
  plus: Plus,
  edit: Pencil,
  upload: Upload,
  image: Image,
  imagePlus: ImagePlus,
  clock: Clock,
  timer: Timer,
  stopwatch: TimerReset,
  play: Play,
  pause: Pause,
  stop: Square,
  loop: Repeat,
  retry: RefreshCw,
  volume: Volume2,
  mute: VolumeX,
  delete: Trash2,
  link: Link2,
  pin: Pin,
  skip: StepForward,
  flag: Flag,
  moreVertical: MoreVertical,
};

export default RAIL_ICONS;
