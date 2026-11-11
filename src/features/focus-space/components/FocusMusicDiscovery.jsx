/**
 * FocusMusicDiscovery — real music search inside the Focus Space sounds panel.
 *
 * Sources (both through the server proxy, never the browser directly):
 *   itunes     — REAL song/artist/album metadata (cover, artist, album, genre,
 *                duration) + a legal 30-second preview URL. Commercial tracks
 *                are NOT full-playable — the UI says so explicitly.
 *   openverse  — full-length Creative-Commons tracks (fully playable).
 *
 * UX: debounce 450ms · loading spinner · empty state · error + Retry ·
 * "Load more" pagination · Arabic & English queries · no fake data ever.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useAudio } from "../../audio/AudioContext";
import { searchAudio } from "../../audio/services/audioHub.service";
import {
  SearchIcon, CloseIcon, PlayIcon, PauseIcon, RetryIcon, MusicIcon,
} from "../constants/focusIcons";
import "../styles/focus-space.css";

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

const PAGE_LIMIT = 12;

export const FocusMusicDiscovery = () => {
  const { t } = useTranslation();
  const { playTrack, currentTrack, isPlaying, toggle } = useAudio();

  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("itunes"); // itunes | openverse
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cached, setCached] = useState(false);

  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  // Debounced search — the raw input updates instantly, the query lags 450ms.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(raw.trim()), 450);
    return () => clearTimeout(debounceRef.current);
  }, [raw]);

  const runSearch = useCallback(async (q, pageNum, append) => {
    if (!q) {
      setStatus("idle");
      setItems([]);
      setHasMore(false);
      return;
    }
    const reqId = ++reqIdRef.current;
    if (append) setLoadingMore(true);
    else setStatus("loading");

    const result = await searchAudio(q, { page: pageNum, limit: PAGE_LIMIT, source });
    if (reqId !== reqIdRef.current) return; // a newer search superseded this one

    if (result.ok) {
      setCached(Boolean(result.cached));
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setHasMore(result.items.length >= PAGE_LIMIT);
      setStatus("done");
    } else {
      if (!append) setItems([]);
      setError(result.error || "NETWORK");
      setStatus("error");
    }
    setLoadingMore(false);
  }, [source]);

  useEffect(() => {
    setPage(1);
    runSearch(query, 1, false);
  }, [query, runSearch]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) { toggle(); return; }
    // The visible result list becomes the playlist — prev/next work in the widget.
    playTrack(track, { queue: items.length ? items : [track] });
  };

  return (
    <div className="fc-md" dir="auto">
      <div className="fc-md__bar">
        <SearchIcon size={15} strokeWidth={1.75} aria-hidden />
        <input
          className="fc-md__input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("focus.music.searchPlaceholder")}
          aria-label={t("focus.music.searchPlaceholder")}
        />
        {status === "loading" && <span className="mini-spinner" aria-hidden />}
        {raw && (
          <button className="fc-md__clear" onClick={() => setRaw("")} aria-label={t("common.clear")}>
            <CloseIcon size={13} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      <div className="fc-md__sources" role="tablist" aria-label={t("focus.music.source")}>
        <button
          role="tab" aria-selected={source === "jamendo"}
          className={`fc-md__src ${source === "jamendo" ? "is-active" : ""}`}
          onClick={() => setSource("jamendo")}
        >
          {t("focus.music.sourceJamendo")}
        </button>
        <button
          role="tab" aria-selected={source === "openverse"}
          className={`fc-md__src ${source === "openverse" ? "is-active" : ""}`}
          onClick={() => setSource("openverse")}
        >
          {t("focus.music.sourceCC")}
        </button>
        <button
          role="tab" aria-selected={source === "itunes"}
          className={`fc-md__src ${source === "itunes" ? "is-active" : ""}`}
          onClick={() => setSource("itunes")}
        >
          {t("focus.music.sourceReal")}
        </button>
      </div>

      {source === "itunes" && status !== "idle" && (
        <p className="fc-md__note">{t("focus.music.previewNote")}</p>
      )}
      {source === "openverse" && status !== "idle" && (
        <p className="fc-md__note">{t("focus.music.ccNote")}</p>
      )}
      {source === "jamendo" && status !== "idle" && (
        <p className="fc-md__note">{t("focus.music.jamendoNote")}</p>
      )}
      {cached && <p className="fc-md__note fc-md__note--dim">{t("audio.music.cachedNote")}</p>}

      {status === "loading" && (
        <div className="fc-md__state"><span className="mini-spinner" /> {t("focus.music.searching")}</div>
      )}

      {status === "error" && (
        <div className="fc-md__state fc-md__state--error">
          <span>{t("focus.music.error")}</span>
          <button className="fc-btn fc-btn--primary" onClick={() => runSearch(query, page, false)}>
            <RetryIcon size={13} strokeWidth={2} aria-hidden /> {t("common.retry")}
          </button>
        </div>
      )}

      {status === "done" && items.length === 0 && (
        <div className="fc-md__state">{t("focus.music.noResults")}</div>
      )}

      {status === "done" && items.length > 0 && (
        <ul className="fc-md__list">
          {items.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            // فصل صارم: زر Play يظهر فقط لما له مصدر تشغيل كامل (ليس 30s preview).
            // iTunes نتائج metadata فقط — تُعرض كمعلومة مع بيانات ترخيصها.
            const isPreviewOnly = track.source === "itunes";
            const playable = Boolean(track.audioUrl) && !isPreviewOnly;
            return (
              <li key={track.id} className={`fc-md__row ${isCurrent ? "is-current" : ""}`}>
                {playable ? (
                  <button
                    className="fc-md__play"
                    onClick={() => handlePlay(track)}
                    aria-label={t("common.play")}
                  >
                    {track.thumbnail
                      ? <img src={track.thumbnail} alt="" className="fc-md__cover" width="96" height="96" decoding="async" loading="lazy" />
                      : <span className="fc-md__cover fc-md__cover--ph"><MusicIcon size={16} strokeWidth={1.5} aria-hidden /></span>}
                    {isCurrent && isPlaying
                      ? <span className="fc-md__play-ic"><PauseIcon size={14} strokeWidth={2} aria-hidden /></span>
                      : <span className="fc-md__play-ic"><PlayIcon size={14} strokeWidth={2} aria-hidden /></span>}
                  </button>
                ) : (
                  <span className="fc-md__play fc-md__play--info">
                    {track.thumbnail
                      ? <img src={track.thumbnail} alt="" className="fc-md__cover" width="96" height="96" decoding="async" loading="lazy" />
                      : <span className="fc-md__cover fc-md__cover--ph"><MusicIcon size={16} strokeWidth={1.5} aria-hidden /></span>}
                  </span>
                )}
                <div className="fc-md__meta" role={playable ? "button" : undefined} onClick={playable ? () => handlePlay(track) : undefined}>
                  <strong className="fc-md__title">{track.title}</strong>
                  <span className="fc-md__sub">
                    {track.author}
                    {track.album ? ` · ${track.album}` : ""}
                    {track.durationSec ? ` · ${fmtTime(track.durationSec)}` : ""}
                  </span>
                </div>
                {track.license?.code && (
                  <a className="fc-md__license" href={track.license.url} target="_blank" rel="noreferrer noopener">
                    {track.license.code.toUpperCase()}
                  </a>
                )}
                {!playable && (
                  <span className="fc-md__unplayable">
                    {isPreviewOnly ? t("focus.music.metadataOnly") : t("audio.unplayable")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && status === "done" && (
        <button
          className="fc-md__more fc-btn"
          disabled={loadingMore}
          onClick={() => { const p = page + 1; setPage(p); runSearch(query, p, true); }}
        >
          {loadingMore ? <span className="mini-spinner" /> : t("focus.music.loadMore")}
        </button>
      )}
    </div>
  );
};

export default React.memo(FocusMusicDiscovery);
