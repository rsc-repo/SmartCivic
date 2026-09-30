'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  AuthResult,
  AuthUser,
  login as apiLogin,
  register as apiRegister,
  setAuthToken,
} from '@/lib/api';

const STORAGE_KEY = 'smartcivic_auth';

interface StoredAuth {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on first mount (client-only — this app is
  // a normal Next.js app the person runs locally, not a claude.ai
  // artifact, so localStorage is the right tool here).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        setUser(stored.user);
        setAccessToken(stored.accessToken);
        setAuthToken(stored.accessToken);
      }
    } catch {
      // Corrupt/blocked storage — just start logged out.
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persist = (result: AuthResult) => {
    setUser(result.user);
    setAccessToken(result.accessToken);
    setAuthToken(result.accessToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: result.accessToken, user: result.user }),
    );
  };

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    persist(result);
    return result.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const result = await apiRegister(email, password, fullName);
      persist(result);
      return result.user;
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
