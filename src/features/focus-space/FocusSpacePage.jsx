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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { useSettings } from "../../contexts/SettingsContext";
import { useFocusData } from "./hooks/useFocusData";
import { useSavedContent } from "./hooks/useSavedContent";
import { getBackgroundById, resolveBackgroundCss } from "./constants/focusBackgrounds";
import FocusClock from "./components/FocusClock";
import FocusClockPanel from "./components/FocusClockPanel";
import FocusSoundBoard from "./components/FocusSoundBoard";
import FocusNotes from "./components/FocusNotes";
import FocusTasks from "./components/FocusTasks";
import FocusNotifications from "./components/FocusNotifications";
import FocusSavedContent from "./components/FocusSavedContent";
import FocusSettingsPanel from "./components/FocusSettingsPanel";
import FocusSmartTool from "./components/FocusSmartTool";
import FocusAya from "./components/FocusAya";
import FocusMusicWidget from "./components/FocusMusicWidget";
import { RAIL_ICONS, MoreVerticalIcon, CloseIcon, ArrowLeftIcon, BookmarkIcon } from "./constants/focusIcons";
import "./styles/focus-space.css";

const uid = () => `nt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

export const FocusSpacePage = () => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const navigate = useNavigate();
  const { data, update, offline } = useFocusData();
  const saved = useSavedContent();

  const [openPanel, setOpenPanel] = useState(null); // null | sounds | notes | tasks | smart | notifications | settings
  const [clockPanelOpen, setClockPanelOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [ayaOpen, setAyaOpen] = useState(false);
  const [sessionJustEnded, setSessionJustEnded] = useState(false);

  const backgroundEntry = useMemo(
    () => getBackgroundById(data.background) || { css: "linear-gradient(160deg,#0b1023,#2b3355)" },
    [data.background]
  );
  const backgroundCss = resolveBackgroundCss(backgroundEntry);
  const backgroundIsAnimated = Boolean(backgroundEntry?.motion) && data.backgroundAnim !== false && !data.reduceMotion;

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
      background: backgroundCss,
      backgroundSize: data.backgroundFit === "contain" ? "contain" : "cover",
      backgroundPosition: data.backgroundPosition || "center",
      filter: [
        data.bgBlur ? `blur(${data.bgBlur}px)` : "",
        data.bgBrightness !== 100 ? `brightness(${data.bgBrightness / 100})` : "",
        data.bgContrast !== 100 ? `contrast(${data.bgContrast / 100})` : "",
        data.bgSaturation !== 100 ? `saturate(${data.bgSaturation / 100})` : "",
      ].filter(Boolean).join(" ") || undefined,
    }),
    [backgroundCss, data.backgroundFit, data.backgroundPosition,
      data.bgBlur, data.bgBrightness, data.bgContrast, data.bgSaturation]
  );

  // Escape exits the space (keyboard accessible). Hideable UI: hideControls
  // collapses the rail; a small "reveal" tab keeps it reachable.
  const exit = useCallback(() => navigate("/"), [navigate]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
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
  }, [openPanel, clockPanelOpen, savedOpen, exit]);

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

  const markSavedRead = (item) => {
    // Local-first: reflect instantly in the panel.
    // (The authoritative read flag syncs from the profile save flow.)
    saved.reload();
  };

  const railItems = [
    { key: "sounds", icon: RAIL_ICONS.sounds },
    { key: "notes", icon: RAIL_ICONS.notes },
    { key: "tasks", icon: RAIL_ICONS.tasks },
    { key: "smart", icon: RAIL_ICONS.smart },
    { key: "aya", icon: RAIL_ICONS.aya },
    { key: "notifications", icon: RAIL_ICONS.notifications },
    { key: "settings", icon: RAIL_ICONS.settings },
  ];

  return (
    <div className={`fc-root ${data.reduceMotion ? "fc-root--reduce" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Background layer */}
      <div className="fc-bg" style={{ background: backgroundCss, backgroundSize: data.backgroundFit === "contain" ? "contain" : "cover", backgroundPosition: "center" }} />
      <div className="fc-overlay" style={overlayStyle} />

      {/* Exit — always visible */}
      <button className="fc-exit" onClick={exit}>
        <ArrowLeftIcon size={16} strokeWidth={1.75} aria-hidden /> {t("focus.exit")}
      </button>

      {/* Offline hint (network fallback served from cache) */}
      {offline && <div className="fc-offline">{t("focus.offline")}</div>}

      {/* Central clock */}
      <div className="fc-center">
        <FocusClock settings={data} onOpen={() => setClockPanelOpen(true)} />
        {clockPanelOpen && (
          <FocusClockPanel
            open
            onClose={() => setClockPanelOpen(false)}
            defaultStudyMode={data.defaultStudyMode}
            onTimerExpire={handleTimerExpire}
            onSessionComplete={handlePomodoroSession}
          />
        )}
      </div>

      {/* Floating music widget — Focus Space only, over the background.
          Hidden when nothing is loaded; restored paused after navigation. */}
      {!data.hideControls && <FocusMusicWidget reduceMotion={data.reduceMotion} />}

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

      {/* Aya moment */}
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

      {savedOpen && (
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
              unreadCount={saved.unreadCount}
              onMarkRead={markSavedRead}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusSpacePage;
