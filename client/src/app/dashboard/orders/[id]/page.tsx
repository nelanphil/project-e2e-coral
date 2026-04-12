"use client";
import { getBaseUrl } from "@/lib/api";

export function generateStaticParams() {
  return [];
}
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { OrderConfirmation } from "@/lib/types";

const BASE_URL = getBaseUrl();

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(() => Boolean(params.id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    const token = getAuthToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) setError("Order not found");
          else setError("Failed to load order");
          return null;
        }
        return r.json();
      })
      .then((data) => setOrder(data))
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [orderId, router]);

  if (!orderId) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60 mb-4">Invalid order</p>
        <Link href="/dashboard/orders" className="btn btn-primary">
          Back to Order History
        </Link>
      </div>
    );
  }

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

  const productName = (item: OrderConfirmation["lineItems"][0]) =>
    typeof item.product === "object" && item.product?.name
      ? item.product.name
      : "Product";

  return (
    <div>
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Order History
      </Link>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-error">
          <span>{error}</span>
          <Link href="/dashboard/orders" className="btn btn-sm">
            Back to Order History
          </Link>
        </div>
      )}

      {!loading && !error && order && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-base-content/70 mt-1 text-sm">
              #{order.orderNumber ?? order._id.slice(-8).toUpperCase()} ·{" "}
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-lg mb-3">Items</h2>
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
                      className="border-b border-base-300 last:border-0"
                    >
                      <td className="py-2">{productName(item)}</td>
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
              {taxCents > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span>Tax</span>
                  <span>${(taxCents / 100).toFixed(2)}</span>
                </div>
              )}
              {shippingCents > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span>Shipping</span>
                  <span>${(shippingCents / 100).toFixed(2)}</span>
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
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
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
          </div>

          <div>
            <Link href="/dashboard/orders" className="btn btn-primary">
              Back to Order History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
