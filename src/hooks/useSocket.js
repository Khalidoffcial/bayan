import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook to manage a socket connection.
 * @param {string} url - The socket server URL.
 * @returns {React.MutableRefObject} - The socket reference.
 */
const useSocket = (url = process.env.REACT_APP_SERVER_API) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(url, {
      transports: ["websocket", "polling"],
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  return socketRef;
};

export default useSocket;
