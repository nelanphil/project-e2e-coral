"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Globe,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { AdminOrder } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "badge-warning",
    processing: "badge-info",
    paid: "badge-success",
    shipped: "badge-primary",
    delivered: "badge-success",
    cancelled: "badge-error",
    refunded: "badge-secondary",
  };
  return map[status] ?? "badge-ghost";
}

function getPaymentBadge(paymentStatus?: string) {
  const map: Record<string, string> = {
    unpaid: "badge-warning",
    paid: "badge-success",
    refunded: "badge-secondary",
  };
  return map[paymentStatus ?? ""] ?? "badge-ghost";
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [trackingUpdating, setTrackingUpdating] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch order");
      const json = await res.json();
      setOrder(json.order);
    } catch {
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (order) setTrackingInput(order.trackingNumber ?? "");
  }, [order]);

  const handleTrackingSave = async () => {
    setTrackingUpdating(true);
    setError("");
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${BASE_URL}/api/admin/orders/${orderId}/tracking`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ trackingNumber: trackingInput.trim() || null }),
        },
      );
      if (!res.ok) throw new Error("Failed to update tracking");
      const json = await res.json();
      setOrder(json.order);
    } catch {
      setError("Failed to update tracking");
    } finally {
      setTrackingUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setStatusUpdating(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${BASE_URL}/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) throw new Error("Failed to update status");
      const json = await res.json();
      setOrder(json.order);
    } catch {
      setError("Failed to update order status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRefund = async () => {
    if (!order) return;
    setRefunding(true);
    setShowRefundConfirm(false);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${BASE_URL}/api/admin/orders/${orderId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          (errJson as { error?: string }).error ?? "Failed to refund",
        );
      }
      const json = await res.json();
      setOrder(json.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="size-4" /> Back to Orders
        </Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!order) return null;

  const subtotal = order.lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );
  const savings =
    (order.discountAmountCents ?? 0) + (order.pointsDiscountCents ?? 0);
  const total =
    subtotal +
    (order.taxAmount ?? 0) +
    (order.shippingAmount ?? 0) -
    (order.pointsDiscountCents ?? 0) -
    (order.discountAmountCents ?? 0);

  const customer = order.user;
  const isGuest = !customer || customer.role === "guest";
  const customerName = customer?.name || order.email || "Unknown";
  const customerEmail = customer?.email || order.email || "";
  const canRefund =
    order.status !== "refunded" &&
    order.paymentStatus !== "refunded" &&
    !!order.stripePaymentIntentId;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/admin/orders" className="btn btn-ghost btn-sm gap-2">
        <ArrowLeft className="size-4" /> Back to Orders
      </Link>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setError("")}>
            ✕
          </button>
        </div>
      )}

      {/* Order Header */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {order.orderNumber ?? order._id.slice(-8)}
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(order.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Status update dropdown */}
              <select
                className="select select-bordered select-sm"
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusUpdating || order.status === "refunded"}>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded" disabled>
                  Refunded
                </option>
              </select>
              <span className={`badge ${getStatusBadge(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Line Items + Order Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Line Items */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Package className="size-5" /> Items
              </h2>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems.map((li, i) => (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-3">
                            {li.product?.images?.[0] && (
                              <div className="avatar">
                                <div className="w-10 h-10 rounded">
                                  <Image
                                    src={li.product.images[0]}
                                    alt={li.product.name}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            <span className="font-medium text-sm">
                              {li.product?.name ?? "Unknown Product"}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">{li.quantity}</td>
                        <td className="text-right">{formatCents(li.price)}</td>
                        <td className="text-right font-medium">
                          {formatCents(li.price * li.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCents(subtotal)}</span>
                </div>
                {(order.discountAmountCents ?? 0) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>
                      Discount
                      {order.discountCode ? ` (${order.discountCode})` : ""}
                    </span>
                    <span>-{formatCents(order.discountAmountCents!)}</span>
                  </div>
                )}
                {(order.pointsDiscountCents ?? 0) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>
                      Points Discount ({order.pointsApplied ?? 0} pts)
                    </span>
                    <span>-{formatCents(order.pointsDiscountCents!)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCents(order.taxAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatCents(order.shippingAmount ?? 0)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-success font-medium">
                    <span>Total Savings</span>
                    <span>-{formatCents(savings)}</span>
                  </div>
                )}
                <div className="divider my-1" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCents(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Customer, Shipping, Payment, Tracking, Refund */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">Customer</h2>
              <div className="text-sm space-y-1">
                <div className="font-medium">
                  {customerName}
                  {isGuest && (
                    <span className="badge badge-ghost badge-xs ml-2">
                      Guest
                    </span>
                  )}
                </div>
                <div className="text-base-content/60">{customerEmail}</div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <MapPin className="size-5" /> Shipping Address
              </h2>
              <div className="text-sm space-y-0.5">
                <div>{order.shippingAddress.line1}</div>
                {order.shippingAddress.line2 && (
                  <div>{order.shippingAddress.line2}</div>
                )}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.postalCode}
                </div>
                <div>{order.shippingAddress.country}</div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <CreditCard className="size-5" /> Payment
              </h2>
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span
                    className={`badge badge-sm ${getPaymentBadge(order.paymentStatus)}`}>
                    {(order.paymentStatus ?? "unpaid").charAt(0).toUpperCase() +
                      (order.paymentStatus ?? "unpaid").slice(1)}
                  </span>
                </div>
                {order.stripePaymentIntentId && (
                  <div>
                    <span className="text-base-content/60">Stripe PI: </span>
                    <span className="font-mono text-xs break-all">
                      {order.stripePaymentIntentId}
                    </span>
                  </div>
                )}
                {order.stripeCheckoutSessionId && (
                  <div>
                    <span className="text-base-content/60">
                      Stripe Session:{" "}
                    </span>
                    <span className="font-mono text-xs break-all">
                      {order.stripeCheckoutSessionId}
                    </span>
                  </div>
                )}
                {order.paypalOrderId && (
                  <div>
                    <span className="text-base-content/60">PayPal: </span>
                    <span className="font-mono text-xs break-all">
                      {order.paypalOrderId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Truck className="size-5" /> Tracking
              </h2>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter tracking ID"
                  className="input input-bordered input-sm w-full font-mono"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  disabled={trackingUpdating}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleTrackingSave}
                  disabled={trackingUpdating}
                >
                  {trackingUpdating ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    "Save Tracking"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Visitor Metadata */}
          {(order.ipAddress || order.geoCity) && (
            <div className="collapse collapse-arrow bg-base-100 shadow">
              <input type="checkbox" />
              <div className="collapse-title font-medium flex items-center gap-2">
                <Globe className="size-4" /> Visitor Metadata
              </div>
              <div className="collapse-content text-sm space-y-1">
                {order.ipAddress && (
                  <div>
                    <span className="text-base-content/60">IP: </span>
                    {order.ipAddress}
                  </div>
                )}
                {order.geoCity && (
                  <div>
                    <span className="text-base-content/60">Location: </span>
                    {[order.geoCity, order.geoRegion, order.geoCountry]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {order.userAgent && (
                  <div>
                    <span className="text-base-content/60">User Agent: </span>
                    <span className="text-xs break-all">{order.userAgent}</span>
                  </div>
                )}
                {order.referer && (
                  <div>
                    <span className="text-base-content/60">Referer: </span>
                    <span className="text-xs break-all">{order.referer}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refund Button */}
          {canRefund && (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                {!showRefundConfirm ? (
                  <button
                    type="button"
                    className="btn btn-error btn-sm w-full"
                    onClick={() => setShowRefundConfirm(true)}
                    disabled={refunding}>
                    Refund Order
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-warning">
                      <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold">
                          Are you sure you want to issue a full refund?
                        </p>
                        <p className="text-base-content/60 mt-1">
                          This will refund {formatCents(total)} to the customer
                          via Stripe, reverse any earned reward points, return
                          spent points, and restore inventory. This action
                          cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-error btn-sm flex-1"
                        onClick={handleRefund}
                        disabled={refunding}>
                        {refunding ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Confirm Refund"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm flex-1"
                        onClick={() => setShowRefundConfirm(false)}
                        disabled={refunding}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
