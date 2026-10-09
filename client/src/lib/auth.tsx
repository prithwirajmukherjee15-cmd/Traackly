import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, UNAUTHORIZED_EVENT } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const ACCESS_REMOVED = 'Your access has been removed — contact your administrator.';
export const SESSION_EXPIRED = 'Your session has expired — log in again.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((r) => !cancelled && setUser(r.user))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 (expired, logged out elsewhere, or deactivated mid-session) sends the user to login.
  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      const err = (e as CustomEvent<ApiError>).detail;
      setUser((current) => {
        if (current) {
          queryClient.clear();
          const notice = err?.code === 'access_removed' ? ACCESS_REMOVED : SESSION_EXPIRED;
          navigate('/login', { replace: true, state: { notice, tone: 'danger' } });
        }
        return null;
      });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate, queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    queryClient.clear();
    navigate('/login', { replace: true, state: { notice: "You've been logged out." } });
  }, [navigate, queryClient]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
