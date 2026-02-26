"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartDrawer } from "@/lib/cart/cart-drawer-context";

export default function CartPage() {
  const router = useRouter();
  const { openCart } = useCartDrawer();

  useEffect(() => {
    openCart();
    router.replace("/");
  }, [openCart, router]);

  return <p className="p-4 text-base-content/70">Redirecting…</p>;
}
