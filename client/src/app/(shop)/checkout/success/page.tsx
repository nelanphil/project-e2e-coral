"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import type { OrderConfirmation } from "@/lib/types";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clearCart = useCartStore((s) => s.clearCart);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearCart();
    if (!orderId) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
    fetch(`${apiUrl}/api/orders/confirmation/${orderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrder(data))
      .finally(() => setLoading(false));
  }, [orderId, clearCart]);

  const orderTotal =
    order?.lineItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    ) ?? 0;

  const subtotal = orderTotal;
  const discountCents = order?.discountAmountCents ?? 0;
  const pointsDiscount = order?.pointsDiscountCents ?? 0;
  const shippingCents = order?.shippingAmount ?? 0;
  const taxCents = order?.taxAmount ?? 0;
  const grandTotal =
    subtotal + shippingCents + taxCents - discountCents - pointsDiscount;

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Order confirmed</h1>
        <p className="mt-2 text-base-content/70">
          We&apos;ll ship your coral soon.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!loading && !order && (
        <div className="text-center">
          <p className="text-base-content/60 mb-6">
            Your order was placed successfully.
          </p>
          <Link href="/store" className="btn btn-primary">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && order && (
        <div className="space-y-6">
          <div className="bg-base-200 rounded-lg p-4">
            <p className="text-sm text-base-content/60">Order number</p>
            <p className="font-mono font-semibold">
              #{order._id.slice(-8).toUpperCase()}
            </p>
          </div>

          <div className="bg-base-200 rounded-lg p-4">
            <h2 className="font-semibold mb-3">Items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-base-content/60 border-b border-base-300">
                  <th className="pb-2 font-normal">Product</th>
                  <th className="pb-2 font-normal text-center">Qty</th>
                  <th className="pb-2 font-normal text-right">Each</th>
                  <th className="pb-2 font-normal text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-base-300 last:border-0">
                    <td className="py-2">{item.product.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">
                      ${(item.price / 100).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-semibold mt-3 pt-3 border-t border-base-300">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            {order.discountCode && discountCents > 0 && (
              <div className="flex justify-between text-sm text-success mt-1">
                <span>Discount ({order.discountCode})</span>
                <span>-${(discountCents / 100).toFixed(2)}</span>
              </div>
            )}
            {shippingCents > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Shipping</span>
                <span>${(shippingCents / 100).toFixed(2)}</span>
              </div>
            )}
            {taxCents > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Tax</span>
                <span>${(taxCents / 100).toFixed(2)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-success mt-1">
                <span>Rewards discount</span>
                <span>-${(pointsDiscount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-base-300">
              <span>Order total</span>
              <span>${(grandTotal / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-4">
            <h2 className="font-semibold mb-2">Shipping to</h2>
            <address className="not-italic text-sm text-base-content/80 leading-relaxed">
              {order.shippingAddress.line1}
              <br />
              {order.shippingAddress.line2 && (
                <>
                  {order.shippingAddress.line2}
                  <br />
                </>
              )}
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </address>
          </div>

          <div className="text-center">
            <Link href="/store" className="btn btn-primary">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
