import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth.js';

/**
 * Drop-in replacement for useState that mirrors the value to localStorage.
 * The key is automatically scoped to the active user (`<userId>-<key>`), so
 * each user's draft / search / selection is preserved separately. Logout
 * wipes all of these via clearUserStorage in AuthContext.
 */
export function usePersistentState(key, initialValue) {
  const { user } = useAuth();
  const userKey = user ? `${user.id}-${key}` : key;
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(userKey);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(userKey, JSON.stringify(value));
    } catch {
      console.error('Failed to save persistent state');
    }
  }, [userKey, value]);

  return [value, setValue];
}
