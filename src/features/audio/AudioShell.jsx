/**
 * AudioShell — mounts the persistent MiniPlayer + the full-screen
 * DiscoveryHub overlay at the app root. Lives OUTSIDE <Routes> so
 * playback and the player state survive every route change.
 *
 * AudioLibraryProvider now wraps AudioProvider at App root (App.js) — the
 * engine needs it for listen/progress recording. This shell only decides
 * VISIBILITY: the player UI is a Focus Space feature. Outside /focus the
 * MiniPlayer and the Hub overlay are NOT rendered (the engine itself keeps
 * running, paused — state is never destroyed).
 */
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { MiniPlayer } from "./MiniPlayer";
import { DiscoveryHub } from "./DiscoveryHub";
import "./audio.css";

/** Must match AudioContext FOCUS_ROUTE. */
const FOCUS_ROUTE = "/focus";

const AudioShell = () => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const inFocus =
    location.pathname === FOCUS_ROUTE || location.pathname.startsWith(FOCUS_ROUTE + "/");

  return (
    <>
      {inFocus && (
        <>
          <MiniPlayer onExpand={() => setExpanded(true)} />
          {expanded && <DiscoveryHub onClose={() => setExpanded(false)} />}
        </>
      )}
    </>
  );
};

export default AudioShell;
