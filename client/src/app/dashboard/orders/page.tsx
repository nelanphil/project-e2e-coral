"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Package, ShoppingBag, ChevronRight } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";

interface OrderLineItem {
  product: string | { _id: string; name?: string };
  quantity: number;
  price: number;
}

interface CustomerOrder {
  _id: string;
  orderNumber?: string;
  status: string;
  lineItems: OrderLineItem[];
  createdAt: string;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmountCents?: number;
  pointsDiscountCents?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getOrderTotal(order: CustomerOrder): number {
  const subtotal = order.lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0
  );
  const shipping = order.shippingAmount ?? 0;
  const tax = order.taxAmount ?? 0;
  const discount = order.discountAmountCents ?? 0;
  const pointsDiscount = order.pointsDiscountCents ?? 0;
  return subtotal + shipping + tax - discount - pointsDiscount;
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] ?? status;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setOrders([]);
        return;
      }
      const res = await fetch(`${BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setOrders([]);
          return;
        }
        throw new Error("Failed to fetch orders");
      }
      const data = (await res.json()) as { orders: CustomerOrder[] };
      setOrders(data.orders ?? []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Unable to load orders. Please try again.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalOrders = orders.length;
  const pendingCount = orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  ).length;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Order History</h1>
        <p className="text-base-content/70 mt-2 text-sm sm:text-base">
          View and manage your orders
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Order Stats */}
        <div className="stats stats-vertical shadow w-full">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Package className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Orders</div>
            <div className="stat-value text-2xl sm:text-4xl">
              {loading ? "-" : totalOrders}
            </div>
            <div className="stat-desc text-xs">All time</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Pending</div>
            <div className="stat-value text-2xl sm:text-4xl">
              {loading ? "-" : pendingCount}
            </div>
            <div className="stat-desc text-xs">Awaiting fulfillment</div>
          </div>
        </div>

        {/* Orders List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-lg sm:text-xl mb-4">Your Orders</h2>
            <div className="divider my-2"></div>

            {loading && (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg" />
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => fetchOrders()}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="avatar placeholder mb-4">
                  <div className="bg-neutral text-neutral-content rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    <Package className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
                  No orders yet
                </h3>
                <p className="text-base-content/70 text-center mb-6 text-sm sm:text-base px-4">
                  Start shopping to see your orders here! You can view order
                  details, track shipments, and manage returns.
                </p>
                <Link href="/" className="btn btn-primary w-full sm:w-auto">
                  Start Shopping
                </Link>
              </div>
            )}

            {!loading && !error && orders.length > 0 && (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order._id}
                    href={`/dashboard/orders/${order._id}`}
                    className="block p-4 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          #{order.orderNumber ?? order._id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-sm text-base-content/70">
                          {formatDate(order.createdAt)} · {getStatusLabel(order.status)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          ${(getOrderTotal(order) / 100).toFixed(2)}
                        </span>
                        <ChevronRight className="w-5 h-5 text-base-content/60" />
                      </div>
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {order.lineItems.length} item
                      {order.lineItems.length !== 1 ? "s" : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
