"use client";
import { getBaseUrl } from "@/lib/api";
import { create } from "zustand";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/auth";
import type { UserInfo } from "@/lib/types";

export interface UserState {
  user: UserInfo | null;
  loading: boolean;
  setUser: (user: UserInfo | null) => void;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  /** Call from useEffect on mount to hydrate from token. */
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  login: (token, user) => {
    setAuthToken(token);
    set({ user });
  },

  logout: () => {
    clearAuthToken();
    set({ user: null });
  },

  fetchUser: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      clearAuthToken();
      set({ user: null, loading: false });
    }
  },
}));
