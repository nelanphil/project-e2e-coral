"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getAuthToken, setAuthToken, clearAuthToken } from "./auth";
import type { UserInfo } from "./types";
import { useUserStore } from "@/stores/user-store";

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  setUser: (u: UserInfo | null) => void;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const setUserStore = useUserStore((s) => s.setUser);
  const loginStore = useUserStore((s) => s.login);
  const logoutStore = useUserStore((s) => s.logout);

  const setUser = useCallback((u: UserInfo | null) => {
    setUserState(u);
    setUserStore(u);
  }, [setUserStore]);

  const logout = useCallback(() => {
    clearAuthToken();
    setUserState(null);
    logoutStore();
  }, [logoutStore]);

  const login = useCallback((token: string, u: UserInfo) => {
    setAuthToken(token);
    setUserState(u);
    loginStore(token, u);
  }, [loginStore]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${getBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data: { user: UserInfo }) => {
        setUserState(data.user);
        setUserStore(data.user);
      })
      .catch(() => clearAuthToken())
      .finally(() => setLoading(false));
  }, [setUserStore]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
