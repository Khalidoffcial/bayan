/**
 * FocusSpacePage — the full-screen immersive study space.
 *
 * Layout:
 *   background layer → overlay layer → clock (center) → side rail (controls)
 *   → bottom "Saved for Later" pill → smart tool corner.
 *
 * Everything (clock, rail, overlay) can be hidden (hideControls /
 * overlayVisible) to reduce distractions; Exit is always reachable via
 * a keyboard shortcut too (Escape).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { useSettings } from "../../contexts/SettingsContext";
import { useFocusData } from "./hooks/useFocusData";
import { useSavedContent } from "./hooks/useSavedContent";
import { useAyaSession } from "./hooks/useAyaSession";
import { useAyaActivity } from "./hooks/useAyaActivity";
import useTimerEngine from "./hooks/useTimerEngine";
import { getBackgroundById, resolveBackgroundCss } from "./constants/focusBackgrounds";
import FocusClock from "./components/FocusClock";
import FocusClockPanel from "./components/FocusClockPanel";
import FocusSoundBoard from "./components/FocusSoundBoard";
import FocusNotes from "./components/FocusNotes";
import FocusTasks from "./components/FocusTasks";
import FocusNotifications from "./components/FocusNotifications";
import FocusSavedContent from "./components/FocusSavedContent";
import FocusSavedReader from "./components/FocusSavedReader";
import FocusSettingsPanel from "./components/FocusSettingsPanel";
import FocusSmartTool from "./components/FocusSmartTool";
import FocusAya from "./components/FocusAya";
import AyaCompanion from "./components/AyaCompanion";
import { AyaWelcome, AyaSessionSetup } from "./components/AyaWelcome";
import FocusMusicWidget, { MusicRevealButton } from "./components/FocusMusicWidget";
import FocusBackgroundGallery from "./components/FocusBackgroundGallery";
import { resolveBackground } from "./constants/focusBackgrounds";
import { RAIL_ICONS, MoreVerticalIcon, CloseIcon, ArrowLeftIcon, BookmarkIcon } from "./constants/focusIcons";
import "./styles/focus-space.css";

const uid = () => `nt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Motion background video — muted loop with an explicit play() retry:
 *  some browsers (and headless test browsers) refuse autoPlay alone. */
const BgVideo = ({ src, k }) => {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let tries = 0;
    const tryPlay = () => {
      if (tries++ > 5 || !v.paused) return;
      v.play().catch(() => setTimeout(tryPlay, 600));
    };
    v.addEventListener("loadeddata", tryPlay);
    tryPlay();
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, [src]);
  return (
    <video ref={ref} key={k} className="fc-bg-video" src={src} loop muted playsInline preload="metadata" aria-hidden />
  );
};

const RailIcon = ({ icon: Icon, label, active, onClick }) => (
  <button
    className={`fc-rail__btn ${active ? "active" : ""}`}
    onClick={onClick}
    data-tip={label}
    aria-label={label}
    aria-pressed={active}
  >
    <Icon size={19} strokeWidth={1.75} aria-hidden />
  </button>
);

/** Saved BOOK items open the dedicated BookReaderPage (PDF/HTML/EPUB access),
 *  not the text reader — a tiny wrapper keeps the saved-list contract. */
const BookOpenRedirect = ({ item, onBack }) => {
  const navigate = useNavigate();
  useEffect(() => {
    onBack();
    navigate(`/books/${encodeURIComponent(item.contentId)}`, { state: { readProgressPercent: item.readProgressPercent } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

export const FocusSpacePage = () => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const navigate = useNavigate();
  const { data, update, offline } = useFocusData();
  const saved = useSavedContent();

  const [openPanel, setOpenPanel] = useState(null); // null | sounds | notes | tasks | smart | notifications | settings
  const [clockPanelOpen, setClockPanelOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [readingItem, setReadingItem] = useState(null); // saved item being read in-space
  const [ayaOpen, setAyaOpen] = useState(false);
  const [sessionJustEnded, setSessionJustEnded] = useState(false);

  // ── Shared timer engine ──
  // ONE engine for the whole page. FocusClockPanel and Aya both receive it,
  // so closing the clock panel (unmount) never stops/loses a running timer.
  const [ayaExpireState, setAyaExpireState] = useState(null);
  const handleEngineExpire = useCallback((expiredState) => {
    setAyaExpireState({ ...(expiredState || {}), expiredAt: Date.now() });
    handleTimerExpireRef.current?.(expiredState);
  }, []);
  const engine = useTimerEngine({ onExpire: handleEngineExpire });

  // ── Aya experience state ──
  // Welcome shows ONCE per browser tab session (sessionStorage), never on
  // every route change. The user can close it or defer it.
  const [ayaStage, setAyaStage] = useState(() =>
    sessionStorage.getItem("ayaWelcomeShown") ? "idle" : "welcome"
  );
  const [ayaMinimized, setAyaMinimized] = useState(false);

  const backgroundEntry = useMemo(
    () => resolveBackground(data.background, data.customBgType ? { type: data.customBgType, src: "__custom__" } : null),
    [data.background, data.customBgType]
  );
  const motionAllowed = data.backgroundAnim !== false && !data.reduceMotion;
  const isVideoBg = backgroundEntry.type === "video" && motionAllowed;

  // load the locally-stored custom background blob (IndexedDB) when selected
  const [customSrc, setCustomSrc] = useState(null);
  useEffect(() => {
    let dead = false;
    if (data.background !== "custom" || !data.customBgType) { setCustomSrc(null); return; }
    import("./components/FocusBackgroundGallery").then(async ({ ensureCustomLoaded }) => {
      if (dead) return;
      const url = await ensureCustomLoaded();
      if (!dead) setCustomSrc(url);
    }).catch(() => setCustomSrc(null));
    return () => { dead = true; };
  }, [data.background, data.customBgType]);

  const overlayStyle = useMemo(
    () => ({
      opacity: data.overlayVisible ? data.overlayOpacity / 100 : 0,
      filter: `brightness(${data.brightness / 100})`,
    }),
    [data.overlayVisible, data.overlayOpacity, data.brightness]
  );

  // Background layer filters (blur/brightness/contrast/saturation), applied
  // ONLY to the bg layer so panels/text above stay crisp.
  const bgLayerStyle = useMemo(
    () => ({
      background: isVideoBg && !customSrc
        ? backgroundEntry.fallbackCss // static poster/fallback under the video
        : backgroundEntry.type === "image" && customSrc
          ? `url("${customSrc}")`
          : resolveBackgroundCss(backgroundEntry),
      backgroundSize: data.backgroundFit === "contain" ? "contain" : "cover",
      backgroundPosition: data.backgroundPosition || "center",
      filter: [
        data.bgBlur ? `blur(${data.bgBlur}px)` : "",
        data.bgBrightness !== 100 ? `brightness(${data.bgBrightness / 100})` : "",
        data.bgContrast !== 100 ? `contrast(${data.bgContrast / 100})` : "",
        data.bgSaturation !== 100 ? `saturate(${data.bgSaturation / 100})` : "",
      ].filter(Boolean).join(" ") || undefined,
    }),
    [backgroundEntry, customSrc, data.backgroundFit, data.backgroundPosition,
      data.bgBlur, data.bgBrightness, data.bgContrast, data.bgSaturation]
  );

  // Escape exits the space (keyboard accessible). Hideable UI: hideControls
  // collapses the rail; a small "reveal" tab keeps it reachable.
  const exit = useCallback(() => navigate("/"), [navigate]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (readingItem) { setReadingItem(null); return; }
        if (openPanel || clockPanelOpen || savedOpen) {
          setOpenPanel(null);
          setClockPanelOpen(false);
          setSavedOpen(false);
        } else {
          exit();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPanel, clockPanelOpen, savedOpen, readingItem, exit]);

  const pushNotification = useCallback(
    (type, title, body) => {
      update({
        notifications: [
          { id: uid(), type, title, body, createdAt: new Date().toISOString(), read: false },
          ...(data.notifications || []),
        ].slice(0, 50),
      });
    },
    [data.notifications, update]
  );

  // Real session logging: engine expiry records a completed focus session.
  // (Aya ALSO sees the expiry through `ayaExpireState` above — timer expiry
  // is NOT goal achievement, Aya asks the user instead.)
  const handleTimerExpireRef = useRef(null);
  const handleTimerExpire = useCallback(
    (expiredState) => {
      if (!expiredState) return;
      const session = {
        id: uid(),
        mode: expiredState.mode,
        startedAt: expiredState.startedAt ? new Date(expiredState.startedAt).toISOString() : "",
        endedAt: new Date().toISOString(),
        plannedMinutes: Math.round((expiredState.durationMs || 0) / 60000),
        actualMinutes: Math.round((expiredState.durationMs || 0) / 60000),
        completed: expiredState.mode !== "pomodoro" || expiredState.meta?.phase === "focus",
        type: expiredState.meta?.phase === "break" ? "break" : "focus",
      };
      update({ sessions: [...(data.sessions || []), session].slice(-100) });
      setSessionJustEnded(true);
      pushNotification("session_end", t("focus.notifications.sessionTitle"), t("focus.notifications.sessionBody"));
      setTimeout(() => setSessionJustEnded(false), 8000);
    },
    [data.sessions, update, pushNotification, t]
  );
  handleTimerExpireRef.current = handleTimerExpire;

  const handlePomodoroSession = useCallback(
    ({ modeKey, minutes }) => {
      const session = {
        id: uid(),
        mode: modeKey,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        plannedMinutes: minutes,
        actualMinutes: minutes,
        completed: true,
        type: "focus",
      };
      update({ sessions: [...(data.sessions || []), session].slice(-100) });
      pushNotification("session_end", t("focus.notifications.sessionTitle"), t("focus.notifications.sessionBody"));
    },
    [data.sessions, update, pushNotification, t]
  );

  const markSavedRead = () => saved.reload();

  // Escape also closes the in-space reader before exiting the space

  // ── Aya session brain (wired to the REAL shared engine) ──
  const aya = useAyaSession({ engine, onExpire: ayaExpireState });

  // Activity awareness — presence only (mouse/keys/touch/scroll), throttled.
  // One idle nudge per idle period; one welcome-back message. Mouse movement
  // alone is never treated as productivity or distraction.
  const { idle } = useAyaActivity({
    onIdleStart: () => { if (aya.session && !aya.session.done) aya.nudge("idleNudge"); },
    onReturn: () => { if (aya.session && !aya.session.done) aya.nudge("returned"); },
  });

  // Aya Read-Later reminder — ONE gentle message per tab session, only when
  // the user actually has unread saved content and no active Aya session.
  const readLaterNudgedRef = useRef(sessionStorage.getItem("ayaReadLaterNudged") === "1");
  useEffect(() => {
    if (readLaterNudgedRef.current) return;
    if (aya.session || aya.message) return; // never interrupt a live session/message
    if (saved.loading || saved.error || saved.items.length === 0) return;
    const unread = saved.items.filter((i) => i.readStatus !== "completed");
    if (unread.length === 0) return;
    readLaterNudgedRef.current = true;
    sessionStorage.setItem("ayaReadLaterNudged", "1");
    const kinds = unread[0].contentType === "article" ? "مقالات" : unread[0].contentType === "novel" ? "روايات" : "منشورات";
    aya.nudge("readLater", { custom: unread.length > 1
      ? `عندك ${unread.length} ${kinds} حفظتهم قبل كده 📚 تحب تبدأ بواحد منهم؟`
      : "عندك مقال/محتوى محفوظ في اقرأها لاحقًا 📚 تحب تخليه هدف الجلسة دي؟" });
  }, [aya, saved.loading, saved.error, saved.items]);

  // Aya welcome — show once per tab session; “Start with Aya” → setup stage.
  const startAyaFlow = () => {
    sessionStorage.setItem("ayaWelcomeShown", "1");
    setAyaStage("setup");
  };
  const continueAyaFlow = () => {
    sessionStorage.setItem("ayaWelcomeShown", "1");
    setAyaStage("idle");
    setClockPanelOpen(true); // resume → open the real timer so state is visible
  };
  const deferAya = () => {
    sessionStorage.setItem("ayaWelcomeShown", "1");
    setAyaStage("idle");
  };

  const onAyaSessionStart = (config) => {
    aya.startSession(config);
    setAyaStage("idle");
    // Start the REAL engine — the same one the Clock & Timer panel uses.
    engine.startCountdown("timer", config.minutes * 60 * 1000, {
      aya: true,
      phase: "focus",
      goal: config.goal,
      type: config.type,
    });
  };

  const ayaAnswerGoal = (answer) => {
    aya.setGoalQuestion(false);
    if (answer === "done") aya.completeGoal();
    else aya.dismissMessage();
  };

  const railItems = [
    { key: "sounds", icon: RAIL_ICONS.sounds },
    { key: "backgrounds", icon: RAIL_ICONS.backgrounds || RAIL_ICONS.notes },
    { key: "notes", icon: RAIL_ICONS.notes },
    { key: "tasks", icon: RAIL_ICONS.tasks },
    { key: "smart", icon: RAIL_ICONS.smart },
    { key: "aya", icon: RAIL_ICONS.aya },
    { key: "notifications", icon: RAIL_ICONS.notifications },
    { key: "settings", icon: RAIL_ICONS.settings },
  ];

  return (
    <div className={`fc-root ${data.reduceMotion ? "fc-root--reduce" : ""} ${clockPanelOpen ? "has-clock-panel" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Background layer */}
      <div className="fc-bg" style={{ background: bgLayerStyle.background, backgroundSize: bgLayerStyle.backgroundSize, backgroundPosition: bgLayerStyle.backgroundPosition, filter: bgLayerStyle.filter }} />
      {/* Motion background video — muted, looping, poster-backed, only when motion allowed */}
      {isVideoBg && backgroundEntry.src && !customSrc && (
        <BgVideo src={backgroundEntry.src} k={backgroundEntry.id} />
      )}
      {isVideoBg && customSrc && data.customBgType === "video" && (
        <BgVideo src={customSrc} k={customSrc} />
      )}
      <div className="fc-overlay" style={overlayStyle} />

      {/* Exit — always visible */}
      <button className="fc-exit" onClick={exit}>
        <ArrowLeftIcon size={16} strokeWidth={1.75} aria-hidden /> {t("focus.exit")}
      </button>

      {/* Offline hint (network fallback served from cache) */}
      {offline && <div className="fc-offline">{t("focus.offline")}</div>}

      {/* Central clock — clicking the clock opens the real Clock & Timer panel */}
      <div className="fc-center">
        <FocusClock settings={data} onOpen={() => setClockPanelOpen(true)} />
        {clockPanelOpen && (
          <FocusClockPanel
            open
            engine={engine}
            onClose={() => setClockPanelOpen(false)}
            defaultStudyMode={data.defaultStudyMode}
            data={data}
          />
        )}
      </div>

      {/* Floating music widget — Focus Space only, over the background.
          Hidden when nothing is loaded; restored paused after navigation.
          Hide/show persists per user (musicWidgetHidden) and never touches
          the audio element — music keeps playing while hidden. */}
      {!data.hideControls && !data.musicWidgetHidden && (
        <FocusMusicWidget
          reduceMotion={data.reduceMotion}
          onHide={() => update({ musicWidgetHidden: true })}
        />
      )}
      {/* Reveal button — small fixed pill inside Focus Space only. Shown when
          the widget is hidden but there IS a track (playing or paused). */}
      {!data.hideControls && data.musicWidgetHidden && (
        <MusicRevealButton onReveal={() => update({ musicWidgetHidden: false })} />
      )}

      {/* Right-side rail (hidden-able) */}
      {!data.hideControls ? (
        <aside className="fc-rail" aria-label={t("focus.rail")}>
          {railItems.map((item) => (
            <RailIcon
              key={item.key}
              icon={item.icon}
              label={t(`focus.rail.${item.key}`)}
              active={openPanel === item.key}
              onClick={() => {
                if (item.key === "aya") setAyaOpen(true);
                else setOpenPanel((p) => (p === item.key ? null : item.key));
              }}
            />
          ))}
        </aside>
      ) : (
        <button className="fc-rail-reveal" onClick={() => update({ hideControls: false })} aria-label={t("focus.rail.reveal")}>
          <MoreVerticalIcon size={16} strokeWidth={1.75} aria-hidden />
        </button>
      )}

      {/* Side panels */}
      {openPanel && (
        <div className={`fc-side ${openPanel}`}>
          <div className="fc-side__head">
            <strong>{t(`focus.rail.${openPanel}`)}</strong>
            <button className="fc-panel__close" onClick={() => setOpenPanel(null)} aria-label={t("common.close")}><CloseIcon size={15} strokeWidth={2} aria-hidden /></button>
          </div>
          <div className="fc-side__body">
            {openPanel === "sounds" && <FocusSoundBoard />}
            {openPanel === "backgrounds" && <FocusBackgroundGallery data={data} update={update} />}
            {openPanel === "notes" && (
              <FocusNotes
                notes={data.notes || []}
                tasks={data.tasks || []}
                onChange={(notes) => update({ notes })}
              />
            )}
            {openPanel === "tasks" && (
              <FocusTasks
                tasks={data.tasks || []}
                onChange={(tasks) => update({ tasks })}
                onNotify={(title) => pushNotification("task_reminder", title, "")}
              />
            )}
            {openPanel === "smart" && (
              <FocusSmartTool
                notes={data.notes || []}
                tasks={data.tasks || []}
                sessions={data.sessions || []}
                savedItems={saved.items}
              />
            )}
            {openPanel === "notifications" && (
              <FocusNotifications
                notifications={data.notifications || []}
                onChange={(notifications) => update({ notifications })}
              />
            )}
            {openPanel === "settings" && <FocusSettingsPanel data={data} update={update} />}
          </div>
        </div>
      )}

      {/* Aya moment (Quran reminder from the rail) */}
      {ayaOpen && (
        <FocusAya
          visible
          engineRunning={false}
          onOpenQuran={() => {
            setAyaOpen(false);
            setOpenPanel("sounds");
          }}
          onDismiss={() => setAyaOpen(false)}
        />
      )}

      {/* ── Aya companion experience ── */}
      {ayaStage === "welcome" && !data.reduceMotionSafe && (
        <AyaWelcome
          returning={Boolean(engine.state || (data.sessions || []).length)}
          onStart={startAyaFlow}
          onContinue={continueAyaFlow}
          onLater={deferAya}
        />
      )}
      {ayaStage === "setup" && (
        <AyaSessionSetup
          defaultMinutes={data.defaultSessionDuration || 25}
          onStart={onAyaSessionStart}
          onClose={deferAya}
          t={t}
        />
      )}
      {ayaStage === "idle" && (aya.session || aya.message) && (
        <AyaCompanion
          session={aya.session}
          message={aya.message}
          goalQuestion={aya.goalQuestion}
          paused={aya.paused}
          idle={idle}
          remainingMs={aya.remainingMs}
          engineState={engine.state}
          minimize={ayaMinimized}
          onToggleMinimize={() => setAyaMinimized((m) => !m)}
          onDismissMessage={aya.dismissMessage}
          onAnswerGoal={ayaAnswerGoal}
          onExtend={() => aya.extendSession(5)}
          onBreak={() => aya.takeBreak()}
        />
      )}

      {/* Session-end gentle banner */}
      {sessionJustEnded && (
        <div className="fc-session-banner">{t("focus.notifications.sessionBody")}</div>
      )}

      {/* Bottom pill — Saved for Later */}
      <button className="fc-saved-pill" onClick={() => setSavedOpen((s) => !s)}>
        <BookmarkIcon size={16} strokeWidth={1.75} aria-hidden />
        {t("focus.saved.pill")}
        {saved.unreadCount > 0 && <span className="fc-pill-badge">{saved.unreadCount}</span>}
      </button>

      {savedOpen && !readingItem && (
        <div className="fc-saved-drawer">
          <div className="fc-side__head">
            <strong>{t("focus.saved.pill")}</strong>
            <button className="fc-panel__close" onClick={() => setSavedOpen(false)} aria-label={t("common.close")}><CloseIcon size={15} strokeWidth={2} aria-hidden /></button>
          </div>
          <div className="fc-side__body">
            <FocusSavedContent
              items={saved.items}
              loading={saved.loading}
              error={saved.error}
              onRetry={saved.reload}
              onOpenItem={(item) => setReadingItem(item)}
              onListChanged={saved.reload}
            />
          </div>
        </div>
      )}

  // Reading a saved item INSIDE Focus Space — original content from the DB.
  // Books open in their own dedicated reader page instead (formats/access).
  {readingItem && (readingItem.contentType === "book" ? (
    <BookOpenRedirect item={readingItem} onBack={() => setReadingItem(null)} />
  ) : (
    <FocusSavedReader
      item={readingItem}
      onBack={() => {
        setReadingItem(null);
        saved.reload(); // refresh progress badges after reading
      }}
    />
  ))}
    </div>
  );
};

export default FocusSpacePage;
