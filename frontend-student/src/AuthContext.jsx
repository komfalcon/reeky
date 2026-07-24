import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('reeky_token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('reeky_token', token);
      // Fetch user profile on reload
      api.getProfile(token)
        .then(profile => setUser(profile))
        .catch(() => {
          // Token expired or invalid
          setToken(null);
          setUser(null);
        });
    } else {
      localStorage.removeItem('reeky_token');
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await api.signup(name, email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const mockUser = {
      id: "google-scholar-id",
      name: "Google Scholar",
      email: "scholar@google.com",
      preferences: null
    };
    setToken("mock-google-token");
    setUser(mockUser);
    localStorage.setItem('reeky_token', "mock-google-token");
  }, []);

  const updatePreferences = useCallback((newPreferences) => {
    setUser(prev => prev ? { ...prev, preferences: newPreferences } : null);
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
