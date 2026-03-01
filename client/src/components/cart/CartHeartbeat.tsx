"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sends periodic heartbeats (fetchCart) when the cart has items.
 * This refreshes lastActivityAt on the server so reservations stay active
 * while the user is on the site. When the user closes the tab, heartbeats
 * stop and the server will release the reservation after the timeout.
 */
export function CartHeartbeat() {
  const items = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchCart();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [items.length, fetchCart]);

  return null;
}
