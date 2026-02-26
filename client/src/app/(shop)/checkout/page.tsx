"use client";

import { useState } from "react";
import Link from "next/link";
import { getCartSessionId } from "@/lib/cart/cart-session";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const sessionId = getCartSessionId();
    if (!sessionId) {
      setError("Cart session missing. Add items from the shop.");
      setLoading(false);
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    const successUrl = typeof window !== "undefined" ? `${window.location.origin}/checkout/success` : "";
    const cancelUrl = typeof window !== "undefined" ? `${window.location.origin}/cart` : "";
    try {
      const res = await fetch(`${baseUrl}/api/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cart-Session": sessionId,
        },
        body: JSON.stringify({
          paymentMethod,
          successUrl,
          cancelUrl,
          shippingAddress: address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        setLoading(false);
        return;
      }
      if (data.stripeUrl) {
        window.location.href = data.stripeUrl;
        return;
      }
      if (data.error && data.error.includes("PayPal")) {
        setError(data.error);
      } else {
        setError("No payment URL returned.");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <p className="text-error text-sm">{error}</p>}
        <div>
          <label className="label" htmlFor="line1">Address line 1</label>
          <input id="line1" type="text" className="input input-bordered w-full" value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} required />
        </div>
        <div>
          <label className="label" htmlFor="line2">Address line 2</label>
          <input id="line2" type="text" className="input input-bordered w-full" value={address.line2} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" type="text" className="input input-bordered w-full" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="state">State</label>
            <input id="state" type="text" className="input input-bordered w-full" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="postalCode">Postal code</label>
            <input id="postalCode" type="text" className="input input-bordered w-full" value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input id="country" type="text" className="input input-bordered w-full" value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} required />
          </div>
        </div>
        <div>
          <span className="label">Payment</span>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} className="radio" />
              Stripe
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" checked={paymentMethod === "paypal"} onChange={() => setPaymentMethod("paypal")} className="radio" />
              PayPal
            </label>
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Processing…" : "Continue to payment"}
        </button>
      </form>
      <p className="mt-4">
        <Link href="/cart" className="link">Back to cart</Link>
      </p>
    </main>
  );
}
