/**
 * Focus soundscape — ambient sound sources for the study space.
 *
 * IMPORTANT (tested 2026-11-03):
 *  - ALL cdn.pixabay.com direct links now return 403 (Pixabay blocks
 *    hotlinking of its CDN audio). They are removed entirely — no
 *    untested/unverified URLs are shipped.
 *  - The only tested live external sources right now are:
 *      SoundHelix example MP3s        -> 200, audio/mpeg (instrumental)
 *      codeskulptor sounddogs/thrust  -> 200, audio/mp3 (white-noise)
 *  - The nature slots (rain/thunder/forest/birds/waves/fireplace/wind/cafe)
 *    are DISABLED (src: null) until local audio files are provided —
 *    they render in the UI in an explicit "needs local file" error state
 *    rather than pretending to work.
 *
 * Local files go to:  bayan/public/audio/focus/<id>.mp3  (see MISSING_ASSETS).
 */
import { LOCAL_SOUND_SRC } from "./missingAssets";

export const SOUND_CATEGORIES = {
  ambient: "ambient",
  rain: "rain",
  nature: "nature",
  instrumental: "instrumental",
};

export const SOUND_CATALOG = [
  {
    id: "rain",
    category: SOUND_CATEGORIES.rain,
    src: LOCAL_SOUND_SRC.rain,
    needsLocalFile: true,
    defaultVolume: 0.6,
  },
  {
    id: "thunder",
    category: SOUND_CATEGORIES.rain,
    src: LOCAL_SOUND_SRC.thunder,
    needsLocalFile: true,
    defaultVolume: 0.4,
  },
  {
    id: "forest",
    category: SOUND_CATEGORIES.nature,
    src: LOCAL_SOUND_SRC.forest,
    needsLocalFile: true,
    defaultVolume: 0.5,
  },
  {
    id: "birds",
    category: SOUND_CATEGORIES.nature,
    src: LOCAL_SOUND_SRC.birds,
    needsLocalFile: true,
    defaultVolume: 0.35,
  },
  {
    id: "waves",
    category: SOUND_CATEGORIES.nature,
    src: LOCAL_SOUND_SRC.waves,
    needsLocalFile: true,
    defaultVolume: 0.5,
  },
  {
    id: "fireplace",
    category: SOUND_CATEGORIES.ambient,
    src: LOCAL_SOUND_SRC.fireplace,
    needsLocalFile: true,
    defaultVolume: 0.45,
  },
  {
    id: "wind",
    category: SOUND_CATEGORIES.ambient,
    src: LOCAL_SOUND_SRC.wind,
    needsLocalFile: true,
    defaultVolume: 0.4,
  },
  {
    id: "cafe",
    category: SOUND_CATEGORIES.ambient,
    src: LOCAL_SOUND_SRC.cafe,
    needsLocalFile: true,
    defaultVolume: 0.4,
  },
  {
    id: "piano",
    category: SOUND_CATEGORIES.instrumental,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    defaultVolume: 0.5,
  },
  {
    id: "guitar",
    category: SOUND_CATEGORIES.instrumental,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    defaultVolume: 0.45,
  },
  {
    id: "white-noise",
    category: SOUND_CATEGORIES.ambient,
    src: "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3",
    defaultVolume: 0.35,
  },
  {
    id: "deep-focus",
    category: SOUND_CATEGORIES.instrumental,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    defaultVolume: 0.5,
  },
];

export const getSoundById = (id) => SOUND_CATALOG.find((s) => s.id === id) || null;

export default SOUND_CATALOG;
