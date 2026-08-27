import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../constants/apiEndpoints';

/**
 * Custom hook to manage a socket connection with Back-Forward Cache (bfcache) resilience.
 * @param {string} url - The socket server URL.
 * @returns {React.MutableRefObject} - The socket reference.
 */
const useSocket = (url = API_BASE_URL) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Gracefully handle browser Back-Forward Cache (bfcache)
    const handlePageHide = () => {
      if (socket?.connected) {
        socket.disconnect();
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted && !socket?.connected) {
        socket?.connect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !socket?.connected) {
        socket?.connect();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  return socketRef;
};

export default useSocket;

