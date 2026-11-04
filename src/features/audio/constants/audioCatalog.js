/**
 * audioCatalog — the unified local catalog for the Audio Hub.
 *
 * SOURCES (tested live — see the backend audioHub.service for details):
 *   - mp3quran.net reciters  → Quran recitations (audio/mpeg, public CDN)
 *   - SoundHelix demo tracks → Ambient (CC0-style, explicitly published for demo use)
 *
 * Honesty: catalog entries ALWAYS carry audioUrl; nothing is rendered as
 * playable without one. Reciters and every surah are real (mp3quran).
 */
const pad3 = (n) => String(n).padStart(3, "0");

const RECITERS_RAW = [
  { id: "qr:mishary", name: "Mishary Al-Afasy", base: "https://server11.mp3quran.net/afasy" },
  { id: "qr:maher", name: "Maher Al-Muaiqly", base: "https://server11.mp3quran.net/maher" },
  { id: "qr:abdulbasit", name: "Abdul Basit Murattal", base: "https://server11.mp3quran.net/abdulbasit" },
  { id: "qr:hudhaify", name: "Ali Al-Hudhaify", base: "https://server11.mp3quran.net/hudhaify" },
];

export const RECITERS = RECITERS_RAW;

const SURAHS_RAW = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس",
];

export const QURAN_CATALOG = RECITERS_RAW.flatMap((r) =>
  SURAHS_RAW.map((name, i) => ({
    id: `quran:${r.id.replace("qr:", "")}:${pad3(i + 1)}`,
    section: "quran",
    reciterId: r.id,
    reciter: r.name,
    surahNumber: i + 1,
    surahName: name,
    title: `سورة ${name}`,
    author: r.name,
    audioUrl: `${r.base}/${pad3(i + 1)}.mp3`,
    durationSec: 0,
    thumbnail: null,
    licenseCode: "quran",
    licenseUrl: "https://mp3quran.net",
    source: "mp3quran",
  }))
);

const SOUNDHELIX = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const AMBIENT_CATALOG = [
  { id: "amb:piano", section: "ambient", title: "Piano", audioUrl: SOUNDHELIX(1), durationSec: 0, thumbnail: null, licenseCode: "demo", licenseUrl: "https://www.soundhelix.com", source: "soundhelix" },
  { id: "amb:guitar", section: "ambient", title: "Guitar", audioUrl: SOUNDHELIX(2), durationSec: 0, thumbnail: null, licenseCode: "demo", licenseUrl: "https://www.soundhelix.com", source: "soundhelix" },
  { id: "amb:white-noise", section: "ambient", title: "White noise", audioUrl: "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3", durationSec: 0, thumbnail: null, licenseCode: "cc-by-3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", source: "codeskulptor" },
  { id: "amb:deep-focus", section: "ambient", title: "Deep focus", audioUrl: SOUNDHELIX(3), durationSec: 0, thumbnail: null, licenseCode: "demo", licenseUrl: "https://www.soundhelix.com", source: "soundhelix" },
];

/** Local search within catalog (Quran surah names + reciters). */
export const searchLocal = (query, { section = "quran", reciterId } = {}) => {
  const q = (query || "").trim().toLowerCase();
  return QURAN_CATALOG.filter((t) => {
    if (reciterId && t.reciterId !== reciterId) return false;
    if (!q) return true;
    return `${t.surahName} ${t.reciter}`.toLowerCase().includes(q);
  });
};

export default { QURAN_CATALOG, AMBIENT_CATALOG, RECITERS, searchLocal };
