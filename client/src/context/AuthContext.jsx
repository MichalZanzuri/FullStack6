import { useCallback, useEffect, useState } from 'react';

import {
  loginUser,
  registerUser,
  refreshUser,
  updateUserProfile,
  clearToken,
} from '../services/authService.js';
import { clearCache } from '../utils/cache.js';
import { AuthContext } from './authContext.js';

const STORAGE_KEY = 'pulse.auth';

function clearUserStorage(userId) {
  if (!userId) return;
  const prefix = `${userId}-`;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  });
}

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(user) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);

  // Mirror every user change to LocalStorage.
  useEffect(() => {
    writeSession(user);
  }, [user]);

  // On mount, refresh the stored profile from the server (in case it was edited).
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setHydrating(true);
    });
    refreshUser(user.id)
      .then((fresh) => {
        if (cancelled || !fresh) return;
        setUser(fresh);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrating(false); });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const loggedUser = await loginUser(username, password);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (newUser) => {
    setLoading(true);
    try {
      const created = await registerUser(newUser);
      setUser(created);
      return created;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Wipe everything tied to the leaving user before flipping their state.
    clearToken();
    clearCache();
    clearUserStorage(user?.id);
    setUser(null);
    setLoading(false);
  }, [user?.id]);

  const updateProfile = useCallback(
    async (changes) => {
      if (!user) return null;
      // Send ONLY the fields that changed (PATCH) — not the whole user object.
      await updateUserProfile(user.id, changes);
      const merged = { ...user, ...changes };
      setUser(merged);
      return merged;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        hydrating,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
