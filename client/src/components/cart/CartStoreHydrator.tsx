"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

/**
 * Fetches cart once on mount so the Zustand store is hydrated.
 * Place in root layout so cart is available everywhere without each component fetching.
 */
export function CartStoreHydrator() {
  const fetchCart = useCartStore((s) => s.fetchCart);
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
  return null;
}
