import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
const USER_CACHE_KEY = 'reeky_user_cache_v1';

function readCachedUser() {
  try {
    const cached = JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');
    return cached && typeof cached === 'object' ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; authentication still works online.
  }
}

function isOfflineFailure(error) {
  return !error?.status || !navigator.onLine;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [token, setToken] = useState(() => localStorage.getItem('reeky_token'));

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('reeky_token');
      writeCachedUser(null);
      setUser(null);
      return;
    }

    localStorage.setItem('reeky_token', token);

    // Keep the cached identity immediately available while the profile request
    // is waiting or when the browser is offline.
    if (!user) setUser(readCachedUser());

    api.getProfile(token)
      .then(profile => {
        setUser(profile);
        writeCachedUser(profile);
      })
      .catch(error => {
        // A disconnected device must remain inside the offline workspace. Only
        // explicit authorization failures should sign the user out.
        if (!isOfflineFailure(error) && (error.status === 401 || error.status === 403)) {
          setToken(null);
          setUser(null);
          writeCachedUser(null);
        }
      });
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    writeCachedUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await api.signup(name, email, password);
    setToken(data.token);
    setUser(data.user);
    writeCachedUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    writeCachedUser(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const mockUser = {
      id: 'google-scholar-id',
      name: 'Google Scholar',
      email: 'scholar@google.com',
      preferences: null
    };
    setToken('mock-google-token');
    setUser(mockUser);
    localStorage.setItem('reeky_token', 'mock-google-token');
    writeCachedUser(mockUser);
  }, []);

  const updatePreferences = useCallback((newPreferences) => {
    setUser(prev => {
      const nextUser = prev ? { ...prev, preferences: newPreferences } : null;
      writeCachedUser(nextUser);
      return nextUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loginWithGoogle, updatePreferences, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
