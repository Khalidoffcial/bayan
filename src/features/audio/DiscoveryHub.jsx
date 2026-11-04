/**
 * DiscoveryHub — the library home for the Audio Hub.
 *
 * Sections (tabs):
 *   - Discover    — personal sections computed from real signals only:
 *                   Continue Listening / Recently Played / Recommended / Trending
 *   - Music       — CC-music search via the backend Openverse proxy
 *                   (badge makes the Creative-Commons honesty explicit)
 *   - Quran       — full 114-surah library × real reciters (mp3quran)
 *   - Ambient     — Focus SoundBoard's tracks through the same engine
 *   - Favorites   — user-saved (persisted in Firebase)
 *   - Playlists   — user playlists (persisted + shareable in later phases)
 *
 * Honesty rules enforced throughout:
 *   - No result is rendered as playable unless it has audioUrl.
 *   - Music results are CC-licensed only (license badge + link).
 *   - Empty/limited states say exactly why (no network, CC-only sources,
 *     rate limit on the free Openverse tier).
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { useAudio } from "./AudioContext";
import { useAudioLibrary } from "./AudioLibraryProvider";
import { QURAN_CATALOG, AMBIENT_CATALOG, RECITERS } from "./constants/audioCatalog";
import { searchAudio } from "./services/audioHub.service";
import {
  PlayIcon, PauseIcon, SearchIcon, CloseIcon, CheckIcon,
  SmartIcon, BookmarkIcon, PlusIcon, DeleteIcon,
  HistoryIcon, ExternalLinkIcon, MusicIcon, NatureIcon, QuranIcon,
} from "../focus-space/constants/focusIcons";
import "./audio.css";

const TABS = [
  { key: "discover", icon: SmartIcon },
  { key: "music", icon: MusicIcon },
  { key: "quran", icon: QuranIcon },
  { key: "ambient", icon: NatureIcon },
  { key: "favorites", icon: BookmarkIcon },
  { key: "playlists", icon: HistoryIcon },
];

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

// ---------- TrackRow (shared) ---------------------------------------------
const TrackRow = ({ track, onPlay }) => {
  const { t } = useTranslation();
  const { currentTrack, isPlaying } = useAudio();
  const { isFavorite, toggleFavorite, playlists, addToPlaylist } = useAudioLibrary();
  const isCurrent = currentTrack?.id === track.id;
  const playable = Boolean(track.audioUrl);
  const [plMenuOpen, setPlMenuOpen] = useState(false);

  return (
    <div className={`audio-track ${isCurrent ? "is-current" : ""}`}>
      <button
        className="audio-track__glyph"
        aria-label={t("common.play")}
        disabled={!playable}
        onClick={() => onPlay(track)}
      >
        {isCurrent && isPlaying ? <PauseIcon size={15} strokeWidth={2} aria-hidden /> : <PlayIcon size={15} strokeWidth={2} aria-hidden />}
      </button>
      <button
        className="audio-track__main"
        onClick={() => onPlay(track)}
        disabled={!playable}
        aria-label={t("common.play")}
      >
        <span className="audio-track__meta">
          <strong>{track.title}</strong>
          <span>
            {track.author || track.reciter || ""}
            {track.durationSec ? ` · ${fmtTime(track.durationSec)}` : ""}
          </span>
        </span>
        {track.licenseCode && track.section === "music" && (
          <span className="audio-badge" title={track.licenseUrl || ""}>
            {track.licenseCode.toUpperCase()}
          </span>
        )}
      </button>
      <div className="audio-track__actions">
        <button
          className={`audio-mini-btn ${isFavorite(track.id) ? "is-active" : ""}`}
          onClick={() => toggleFavorite(track)}
          aria-pressed={isFavorite(track.id)}
          aria-label={t("audio.favorite")}
          title={t("audio.favorite")}
        >
          <BookmarkIcon size={15} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          className="audio-mini-btn"
          onClick={() => setPlMenuOpen((o) => !o)}
          aria-expanded={plMenuOpen}
          aria-label={t("audio.addToPlaylist")}
          title={t("audio.addToPlaylist")}
        >
          <PlusIcon size={15} strokeWidth={1.75} aria-hidden />
        </button>
        {plMenuOpen && (
          <div className="audio-pl-menu" role="menu">
            {playlists.length === 0 ? (
              <span className="audio-pl-menu__empty">{t("audio.playlists.empty")}</span>
            ) : playlists.map((pl) => (
              <button
                key={pl.id}
                role="menuitem"
                className="audio-pl-menu__item"
                onClick={() => { addToPlaylist(pl.id, track); setPlMenuOpen(false); }}
              >
                {pl.name}
              </button>
            ))}
          </div>
        )}
        {track.licenseUrl && track.section === "music" && (
          <a
            className="audio-mini-btn"
            href={track.licenseUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("audio.licenseLink")}
            title={t("audio.licenseLink")}
          >
            <ExternalLinkIcon size={14} strokeWidth={1.75} aria-hidden />
          </a>
        )}
      </div>
      {isCurrent && <CheckIcon size={14} strokeWidth={2} aria-hidden />}
      {!playable && <span className="audio-track__unplayable">{t("audio.unplayable")}</span>}
    </div>
  );
};

// ---------- Discover tab ----------------------------------------------------
const DiscoverTab = ({ onPlay }) => {
  const { t } = useTranslation();
  const {
    loaded, trending, recommended, recentlyPlayed,
    continueListening, history,
  } = useAudioLibrary();

  if (!loaded) {
    return <div className="audio-empty-state">{t("audio.loading")}</div>;
  }

  const hasSignals = history.length > 0;

  return (
    <div className="audio-discover">
      {!hasSignals && (
        <p className="audio-note">{t("audio.discover.coldStart")}</p>
      )}

      {continueListening.length > 0 && (
        <>
          <h3 className="audio-section-title">{t("audio.discover.continue")}</h3>
          {continueListening.slice(0, 5).map(({ track, positionSec, durationSec }) => (
            <div key={track.id} className="audio-resume-row">
              <TrackRow track={track} onPlay={onPlay} />
              <span className="audio-resume-info">
                {fmtTime(positionSec)} / {fmtTime(durationSec)}
              </span>
              <button
                className="audio-resume-btn"
                onClick={() => onPlay(track, { startAt: positionSec })}
              >
                <PlayIcon size={13} strokeWidth={2} aria-hidden /> {t("audio.resume")}
              </button>
            </div>
          ))}
        </>
      )}

      {recommended.length > 0 && (
        <>
          <h3 className="audio-section-title">{t("audio.discover.recommended")}</h3>
          {recommended.slice(0, 8).map((track) => (
            <TrackRow key={track.id} track={track} onPlay={onPlay} />
          ))}
        </>
      )}

      {recentlyPlayed.length > 0 && (
        <>
          <h3 className="audio-section-title">{t("audio.discover.recentlyPlayed")}</h3>
          {recentlyPlayed.slice(0, 8).map((track) => (
            <TrackRow key={track.id} track={track} onPlay={onPlay} />
          ))}
        </>
      )}

      {trending.length > 0 && (
        <>
          <h3 className="audio-section-title">{t("audio.discover.trending")}</h3>
          {trending.slice(0, 10).map((track) => (
            <TrackRow key={track.id} track={track} onPlay={onPlay} />
          ))}
        </>
      )}
    </div>
  );
};

// ---------- Music tab (CC search) --------------------------------------------
const MusicTab = ({ onPlay }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ status: "idle", items: [], error: null, cached: false, rateLimited: false });

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setState({ status: "idle", items: [], error: null, cached: false, rateLimited: false });
      return;
    }
    setState({ status: "loading", items: [], error: null, cached: false, rateLimited: false });
    const result = await searchAudio(q, { limit: 20 });
    if (result.ok) {
      setState({
        status: "done",
        items: result.items,
        cached: result.cached,
        rateLimited: result.rateLimited,
      });
    } else {
      setState({ status: "error", items: [], error: result.error, cached: false, rateLimited: false });
    }
  }, []);

  return (
    <div className="audio-music">
      <div className="audio-lib-search">
        <SearchIcon size={16} strokeWidth={1.75} aria-hidden />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
          placeholder={t("audio.music.searchPlaceholder")}
          aria-label={t("audio.music.searchPlaceholder")}
        />
        {state.status === "loading" && <span className="mini-spinner audio-lib-spinner" aria-hidden />}
        {query && (
          <button className="audio-clear-btn" onClick={() => { setQuery(""); runSearch(""); }} aria-label={t("common.clear")}>
            <CloseIcon size={14} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
      {state.cached && <p className="audio-note audio-note--dim">{t("audio.music.cachedNote")}</p>}
      {state.rateLimited && <p className="audio-note">{t("audio.music.rateLimitedNote")}</p>}
      {state.status === "done" && state.items.length === 0 && (
        <p className="audio-empty-state">{t("audio.music.noResults")}</p>
      )}
      {state.items.map((track) => (
        <TrackRow key={track.id} track={track} onPlay={onPlay} />
      ))}
    </div>
  );
};

// ---------- Quran tab ----------------------------------------------------------
const QuranTab = ({ onPlay }) => {
  const { t } = useTranslation();
  const [reciter, setReciter] = useState(RECITERS[0]);
  const [query, setQuery] = useState("");

  const surahs = useMemo(() => {
    const all = QURAN_CATALOG.filter((t) => t.reciterId === reciter.id);
    if (!query.trim()) return all;
    return all.filter((t) => t.surahName.includes(query.trim()));
  }, [reciter, query]);

  return (
    <div className="audio-quran">
      <div className="audio-lib-search">
        <SearchIcon size={16} strokeWidth={1.75} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("audio.quran.searchSurah")}
          aria-label={t("audio.quran.searchSurah")}
        />
      </div>
      <select
        className="audio-reciter-select"
        value={reciter.id}
        onChange={(e) => setReciter(RECITERS.find((r) => r.id === e.target.value))}
        aria-label={t("audio.quran.reciter")}
      >
        {RECITERS.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <p className="audio-note audio-note--dim">{t("audio.quran.note")}</p>
      <div className="audio-list">
        {surahs.map((track) => (
          <TrackRow key={track.id} track={track} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
};

// ---------- Ambient tab (same engine as Focus SoundBoard) ------------------------
const AmbientTab = ({ onPlay }) => {
  const { t } = useTranslation();
  return (
    <div className="audio-list">
      <p className="audio-note audio-note--dim">{t("audio.ambient.note")}</p>
      {AMBIENT_CATALOG.map((track) => (
        <TrackRow key={track.id} track={track} onPlay={onPlay} />
      ))}
    </div>
  );
};

// ---------- Favorites tab --------------------------------------------------------
const FavoritesTab = ({ onPlay }) => {
  const { t } = useTranslation();
  const { loaded, favorites } = useAudioLibrary();
  if (!loaded) return <div className="audio-empty-state">{t("audio.loading")}</div>;
  if (!favorites.length) return <div className="audio-empty-state">{t("audio.favorites.empty")}</div>;
  return (
    <div className="audio-list">
      {favorites.map((track) => (
        <TrackRow key={track.id} track={track} onPlay={onPlay} />
      ))}
    </div>
  );
};

// ---------- Playlists tab ---------------------------------------------------------
const PlaylistsTab = ({ onPlay }) => {
  const { t } = useTranslation();
  const { loaded, playlists, createPlaylist, deletePlaylist } = useAudioLibrary();
  const [name, setName] = useState("");

  if (!loaded) return <div className="audio-empty-state">{t("audio.loading")}</div>;

  return (
    <div className="audio-playlists">
      <div className="audio-pl-create">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("audio.playlists.namePlaceholder")}
          aria-label={t("audio.playlists.namePlaceholder")}
        />
        <button
          className="fc-btn fc-btn--primary"
          disabled={!name.trim()}
          onClick={() => { createPlaylist(name.trim()); setName(""); }}
        >
          {t("audio.playlists.create")}
        </button>
      </div>
      {playlists.length === 0 && <p className="audio-empty-state">{t("audio.playlists.empty")}</p>}
      {playlists.map((pl) => (
        <div key={pl.id} className="audio-pl">
          <div className="audio-pl__head">
            <strong>{pl.name}</strong>
            <button className="audio-mini-btn" onClick={() => deletePlaylist(pl.id)} aria-label={t("common.delete")}>
              <DeleteIcon size={14} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <div className="audio-list">
            {(pl.tracks || []).map((track) => (
              <TrackRow key={track.id} track={track} onPlay={onPlay} />
            ))}
            {(pl.tracks || []).length === 0 && (
              <p className="audio-note audio-note--dim">{t("audio.playlists.emptyTracks")}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- DiscoveryHub root ------------------------------------------------------
export const DiscoveryHub = ({ onClose }) => {
  const { t, dir } = useTranslation();
  const { playTrack } = useAudio();
  const [tab, setTab] = useState("discover");

  const handlePlay = useCallback((track, { startAt = 0 } = {}) => {
    if (!track?.audioUrl) return;
    playTrack(track, { startAt });
  }, [playTrack]);

  const renderTab = () => {
    switch (tab) {
      case "discover": return <DiscoverTab onPlay={handlePlay} />;
      case "music": return <MusicTab onPlay={handlePlay} />;
      case "quran": return <QuranTab onPlay={handlePlay} />;
      case "ambient": return <AmbientTab onPlay={handlePlay} />;
      case "favorites": return <FavoritesTab onPlay={handlePlay} />;
      case "playlists": return <PlaylistsTab onPlay={handlePlay} />;
      default: return null;
    }
  };

  return (
    <div className="audio-library" role="dialog" aria-modal="true" aria-label={t("audio.library")} dir={dir}>
      <div className="audio-library__head">
        <strong className="audio-library__title">{t("audio.library")}</strong>
        <button className="fc-panel__close" onClick={onClose} aria-label={t("common.close")}>
          <CloseIcon size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="audio-library__tabs" role="tablist">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`audio-tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={17} strokeWidth={1.75} aria-hidden />
            {t(`audio.tab.${key}`)}
          </button>
        ))}
      </div>

      <div className="audio-library__body">{renderTab()}</div>
    </div>
  );
};

export default DiscoveryHub;
