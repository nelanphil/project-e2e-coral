"use client";
import { getBaseUrl } from "@/lib/api";
import { create } from "zustand";
import type { CartItem, CartResponse } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";

const CART_SESSION_KEY = "cart_session_id";

function getCartHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const sessionId =
    typeof window !== "undefined"
      ? localStorage.getItem(CART_SESSION_KEY)
      : null;
  if (sessionId) headers["X-Cart-Session"] = sessionId;
  const visitorId = getVisitorId();
  if (visitorId) headers["X-Cookie-Id"] = visitorId;
  return headers;
}

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
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  sessionId: null,
  loading: true,

  fetchCart: async () => {
    set({ loading: true });
    const headers = getCartHeaders();
    try {
      const res = await fetch(`${getBaseUrl()}/api/cart`, { headers });
      const data: CartResponse = res.ok
        ? await res.json()
        : { items: [], sessionId: null };
      if (data.sessionId) setStoredSessionId(data.sessionId);
      set({
        items: data.items ?? [],
        sessionId: data.sessionId,
        loading: false,
      });
    } catch {
      set({ items: [], sessionId: null, loading: false });
    }
  },

  setCartFromResponse: (data: CartResponse) => {
    if (data.sessionId) setStoredSessionId(data.sessionId);
    set({ items: data.items ?? [], sessionId: data.sessionId });
  },

  addItem: async (productId: string, quantity = 1) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...getCartHeaders(),
    };
    const res = await fetch(`${getBaseUrl()}/api/cart`, {
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
    const res = await fetch(`${getBaseUrl()}/api/cart/${productId}`, {
      method: "DELETE",
      headers: getCartHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartResponse;
    get().setCartFromResponse(data);
  },

  updateQuantity: async (productId: string, quantity: number) => {
    const sessionId = getStoredSessionId();
    if (!sessionId) return;
    const res = await fetch(`${getBaseUrl()}/api/cart/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getCartHeaders(),
      },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartResponse;
    get().setCartFromResponse(data);
  },

  clearCart: async () => {
    const sessionId = getStoredSessionId();
    if (!sessionId) return;
    const res = await fetch(`${getBaseUrl()}/api/cart/clear`, {
      method: "POST",
      headers: getCartHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as CartResponse;
    get().setCartFromResponse(data);
  },
}));
