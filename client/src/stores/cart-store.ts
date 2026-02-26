"use client";

import { create } from "zustand";
import type { CartItem, CartResponse } from "@/lib/types";

const CART_SESSION_KEY = "cart_session_id";

function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CART_SESSION_KEY);
}

function setStoredSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_SESSION_KEY, id);
}

export interface CartState {
  items: CartItem[];
  sessionId: string | null;
  loading: boolean;
  /** Hydration-safe: call from useEffect so server and first client render match. */
  fetchCart: () => Promise<void>;
  setCartFromResponse: (data: CartResponse) => void;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
}

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  sessionId: null,
  loading: true,

  fetchCart: async () => {
    set({ loading: true });
    const sessionId = getStoredSessionId();
    const headers: HeadersInit = {};
    if (sessionId) (headers as Record<string, string>)["X-Cart-Session"] = sessionId;
    try {
      const res = await fetch(`${getApiUrl()}/api/cart`, { headers });
      const data: CartResponse = res.ok ? await res.json() : { items: [], sessionId: null };
      if (data.sessionId) setStoredSessionId(data.sessionId);
      set({ items: data.items ?? [], sessionId: data.sessionId, loading: false });
    } catch {
      set({ items: [], sessionId: null, loading: false });
    }
  },

  setCartFromResponse: (data: CartResponse) => {
    if (data.sessionId) setStoredSessionId(data.sessionId);
    set({ items: data.items ?? [], sessionId: data.sessionId });
  },

  addItem: async (productId: string, quantity = 1) => {
    const sessionId = getStoredSessionId();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (sessionId) (headers as Record<string, string>)["X-Cart-Session"] = sessionId;
    const res = await fetch(`${getApiUrl()}/api/cart`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId, quantity }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartResponse;
    get().setCartFromResponse(data);
  },

  removeItem: async (productId: string) => {
    const sessionId = getStoredSessionId();
    if (!sessionId) return;
    const res = await fetch(`${getApiUrl()}/api/cart/${productId}`, {
      method: "DELETE",
      headers: { "X-Cart-Session": sessionId },
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartResponse;
    get().setCartFromResponse(data);
  },
}));
