"use client";
import { getBaseUrl } from "@/lib/api";

export function generateStaticParams() {
  return [];
}
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
  Eye,
  EyeOff,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { AdminOrder } from "@/lib/types";

const BASE_URL = getBaseUrl();

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

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatStatusReason(reason: string) {
  const map: Record<string, string> = {
    admin_change: "Changed by admin",
    admin_refund: "Refunded by admin",
    stripe_payment_received: "Stripe payment received",
    stripe_refund: "Stripe refund event",
    payment_verified: "Payment verified",
    shipping_label_created: "Shipping label created",
    system: "System update",
  };

  if (map[reason]) return map[reason];
  const normalized = reason.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function maskSensitiveValue(value: string) {
  return "*".repeat(Math.max(value.length, 5));
}

type OrderAddress = AdminOrder["shippingAddress"];

function normalizeAddressValue(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function addressesMatch(a?: OrderAddress, b?: OrderAddress) {
  if (!a || !b) return false;

  return (
    normalizeAddressValue(a.line1) === normalizeAddressValue(b.line1) &&
    normalizeAddressValue(a.line2) === normalizeAddressValue(b.line2) &&
    normalizeAddressValue(a.city) === normalizeAddressValue(b.city) &&
    normalizeAddressValue(a.state) === normalizeAddressValue(b.state) &&
    normalizeAddressValue(a.postalCode) ===
      normalizeAddressValue(b.postalCode) &&
    normalizeAddressValue(a.country) === normalizeAddressValue(b.country)
  );
}

function AddressLines({ address }: { address: OrderAddress }) {
  return (
    <div className="text-sm space-y-0.5">
      <div>{address.line1}</div>
      {address.line2 && <div>{address.line2}</div>}
      <div>
        {address.city}, {address.state} {address.postalCode}
      </div>
      <div>{address.country}</div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [trackingUpdating, setTrackingUpdating] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [visiblePaymentFields, setVisiblePaymentFields] = useState<
    Partial<Record<"stripePi" | "stripeSession" | "paypal", boolean>>
  >({});
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
          body: JSON.stringify({
            trackingNumber: trackingInput.trim() || null,
          }),
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

  const togglePaymentFieldVisibility = (
    field: "stripePi" | "stripeSession" | "paypal",
  ) => {
    setVisiblePaymentFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
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
  const customerName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    order.email ||
    "Unknown";
  const customerEmail = customer?.email || order.email || "";
  const canRefund =
    order.status !== "refunded" &&
    order.paymentStatus !== "refunded" &&
    !!order.stripePaymentIntentId;
  const billingAddress = order.billingAddress;
  const showBillingAddress =
    !!billingAddress && !addressesMatch(order.shippingAddress, billingAddress);
  const detailCardsGridClass = showBillingAddress
    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    : "grid grid-cols-1 md:grid-cols-2 gap-4";
  const statusHistory = order.statusHistory ?? [];

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
            onClick={() => setError("")}
          >
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
            <div className="flex min-w-0 flex-col gap-3 sm:items-end">
              {canRefund &&
                (!showRefundConfirm ? (
                  <button
                    type="button"
                    className="btn btn-error btn-sm sm:self-end"
                    onClick={() => setShowRefundConfirm(true)}
                    disabled={refunding}
                  >
                    Refund Order
                  </button>
                ) : (
                  <div className="w-full max-w-xl rounded-box border border-warning/30 bg-base-200 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-warning">
                        <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold">
                            Are you sure you want to issue a full refund?
                          </p>
                          <p className="text-base-content/60 mt-1">
                            This will refund {formatCents(total)} to the
                            customer via Stripe, reverse any earned reward
                            points, return spent points, and restore inventory.
                            This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          className="btn btn-error btn-sm"
                          onClick={handleRefund}
                          disabled={refunding}
                        >
                          {refunding ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            "Confirm Refund"
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowRefundConfirm(false)}
                          disabled={refunding}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

          <div className={detailCardsGridClass}>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <MapPin className="size-5" /> Shipping Address
                </h2>
                <AddressLines address={order.shippingAddress} />
              </div>
            </div>

            {showBillingAddress && billingAddress && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-lg">
                    <MapPin className="size-5" /> Billing Address
                  </h2>
                  <AddressLines address={billingAddress} />
                </div>
              </div>
            )}

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
          </div>
        </div>

        {/* Right column: Customer, Payment, Visitor Metadata */}
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

          {/* Status */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">Status</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="select select-bordered select-sm"
                      value={order.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusUpdating || order.status === "refunded"}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      {order.status === "paid" && (
                        <option value="paid" hidden>
                          Paid
                        </option>
                      )}
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded" disabled>
                        Refunded
                      </option>
                    </select>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {formatStatusLabel(order.status)}
                    </span>
                  </div>
                  {statusUpdating && (
                    <div className="text-xs text-base-content/60">
                      Updating status...
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">
                    History
                  </div>
                  {statusHistory.length === 0 ? (
                    <p className="text-sm text-base-content/60">
                      No status changes recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {statusHistory.map((entry) => (
                        <li
                          key={entry._id}
                          className="rounded-box border border-base-300 p-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-base-content/60">
                            <span>
                              {new Date(entry.createdAt).toLocaleString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            <span className="font-medium">
                              {[
                                entry.performedBy?.firstName,
                                entry.performedBy?.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                                entry.performedBy?.email ||
                                "System"}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {formatStatusLabel(entry.statusBefore)} to{" "}
                            {formatStatusLabel(entry.statusAfter)}
                          </div>
                          <div className="text-xs text-base-content/60 mt-1">
                            {formatStatusReason(entry.reason)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                    className={`badge badge-sm ${getPaymentBadge(order.paymentStatus)}`}
                  >
                    {(order.paymentStatus ?? "unpaid").charAt(0).toUpperCase() +
                      (order.paymentStatus ?? "unpaid").slice(1)}
                  </span>
                </div>
                {order.stripePaymentIntentId && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base-content/60">Stripe PI: </span>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs break-all text-right">
                        {visiblePaymentFields.stripePi
                          ? order.stripePaymentIntentId
                          : maskSensitiveValue(order.stripePaymentIntentId)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square shrink-0"
                        onClick={() => togglePaymentFieldVisibility("stripePi")}
                        aria-pressed={!!visiblePaymentFields.stripePi}
                        aria-label={
                          visiblePaymentFields.stripePi
                            ? "Hide Stripe payment intent ID"
                            : "Show Stripe payment intent ID"
                        }
                      >
                        {visiblePaymentFields.stripePi ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {order.stripeCheckoutSessionId && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base-content/60">
                      Stripe Session:{" "}
                    </span>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs break-all text-right">
                        {visiblePaymentFields.stripeSession
                          ? order.stripeCheckoutSessionId
                          : maskSensitiveValue(order.stripeCheckoutSessionId)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square shrink-0"
                        onClick={() =>
                          togglePaymentFieldVisibility("stripeSession")
                        }
                        aria-pressed={!!visiblePaymentFields.stripeSession}
                        aria-label={
                          visiblePaymentFields.stripeSession
                            ? "Hide Stripe checkout session ID"
                            : "Show Stripe checkout session ID"
                        }
                      >
                        {visiblePaymentFields.stripeSession ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {order.paypalOrderId && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base-content/60">PayPal: </span>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs break-all text-right">
                        {visiblePaymentFields.paypal
                          ? order.paypalOrderId
                          : maskSensitiveValue(order.paypalOrderId)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square shrink-0"
                        onClick={() => togglePaymentFieldVisibility("paypal")}
                        aria-pressed={!!visiblePaymentFields.paypal}
                        aria-label={
                          visiblePaymentFields.paypal
                            ? "Hide PayPal order ID"
                            : "Show PayPal order ID"
                        }
                      >
                        {visiblePaymentFields.paypal ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
        </div>
      </div>
    </div>
  );
}
