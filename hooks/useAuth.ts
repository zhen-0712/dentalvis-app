// ===== useAuth hook =====
import { useState, useEffect, createContext, useContext } from 'react';
import { fetchMe, getToken, removeToken } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

import React from 'react';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  useEffect(() => { refresh(); }, []);

  return React.createElement(AuthContext.Provider, { value: { user, loading, logout, refresh } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
