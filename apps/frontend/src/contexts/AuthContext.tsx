import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, tokenStorage } from '../lib/api';
import { AuthUser, LoginResponse } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!tokenStorage.get()) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get<AuthUser & { mustChangePassword?: boolean }>('/auth/profile');
      setUser({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        status: data.status,
      });
    } catch {
      tokenStorage.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    void refreshProfile().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    tokenStorage.set(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignorar; igual limpiamos sesión local (A-01)
    }
    tokenStorage.clear();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === 'ADMIN', login, logout, refreshProfile }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
