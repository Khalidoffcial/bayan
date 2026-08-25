import { useState, useEffect } from 'react';

/**
 * Custom hook to manage authentication state.
 * @returns {object} - User data and auth controls.
 */
const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("me");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Auth parse error:", err);
      }
    }
  }, []);

  const updateLocalUser = (userData) => {
    setUser(userData);
    localStorage.setItem("me", JSON.stringify(userData));
  };

  return { user, updateLocalUser };
};

export default useAuth;
