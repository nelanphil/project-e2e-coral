"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartDrawer } from "@/lib/cart/cart-drawer-context";
import { getBaseUrl } from "@/lib/api";

function CartRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCart } = useCartDrawer();

  useEffect(() => {
    // If the user was redirected here from a canceled Stripe Checkout session,
    // ask the server to remove the abandoned pending order so it does not
    // linger in the database.
    const canceled = searchParams.get("canceled");
    const stripeSessionId = searchParams.get("session_id");
    const orderId = searchParams.get("order_id");
    if (canceled === "1" && (stripeSessionId || orderId)) {
      const baseUrl = getBaseUrl();
      fetch(`${baseUrl}/api/checkout/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: stripeSessionId ?? undefined,
          orderId: orderId ?? undefined,
        }),
        keepalive: true,
      }).catch(() => {
        // Best-effort cleanup; the webhook + cron will catch stragglers.
      });
    }

    openCart();
    router.replace("/");
  }, [openCart, router, searchParams]);

  return <p className="p-4 text-base-content/70">Redirecting…</p>;
}

export default function CartPage() {
  return (
    <Suspense
      fallback={<p className="p-4 text-base-content/70">Redirecting…</p>}
    >
      <CartRedirect />
    </Suspense>
  );
}
