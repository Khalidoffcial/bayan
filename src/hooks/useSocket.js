import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../constants/apiEndpoints';

/**
 * Shared Socket.IO singleton.
 *
 * Previously every hook that called useSocket() opened its OWN connection
 * (feed, comments, writer, interests, profile… = 4–6 parallel WebSockets
 * per page). Now all callers share ONE multiplexed connection — fewer
 * handshakes, less memory, lower server load. Cleanup is ref-counted:
 * the socket disconnects only when the last consumer unmounts.
 *
 * bfcache handling preserved (pagehide/pageshow/visibilitychange).
 */
let sharedSocket = null;
let refCount = 0;

const getSocket = () => {
  if (sharedSocket) return sharedSocket;
  sharedSocket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Gracefully handle browser Back-Forward Cache (bfcache)
  const handlePageHide = () => {
    if (sharedSocket?.connected) sharedSocket.disconnect();
  };
  const handlePageShow = (event) => {
    if (event.persisted && sharedSocket && !sharedSocket.connected) {
      sharedSocket.connect();
    }
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && sharedSocket && !sharedSocket.connected) {
      sharedSocket.connect();
    }
  };
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return sharedSocket;
};

/**
 * Custom hook to share the app-wide socket connection.
 * @returns {React.MutableRefObject} - The socket reference.
 */
const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket();
    refCount += 1;
    return () => {
      refCount -= 1;
      // Last consumer gone → tear down (route-level unmount only).
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, []);

  return socketRef;
};

export default useSocket;
