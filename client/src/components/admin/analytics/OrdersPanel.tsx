"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminFetch,
  fmtMoney,
  formatVisitorInfo,
  MONTHS,
} from "@/lib/admin-analytics-client";

export interface OrderTopProduct {
  productId: string;
  name: string;
  units: number;
  revenueCents: number;
  orderCount: number;
}

export interface OrderActivityRow {
  type: "order";
  _id: string;
  status: string;
  createdAt: string;
  lineItems: {
    product: { name: string };
    quantity: number;
    price: number;
  }[];
  shippingAddress?: { city: string; state: string };
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geoCity?: string;
  geoRegion?: string;
  geoCountry?: string;
  grandTotalCents: number;
}

export interface OrdersAnalyticsData {
  paidOrderCount: number;
  revenueProductCents: number;
  avgGrandTotalCents: number;
  minGrandTotalCents: number;
  maxGrandTotalCents: number;
  topProducts: OrderTopProduct[];
  recentPaid: OrderActivityRow[];
  recentPendingCheckout: OrderActivityRow[];
}

export function OrdersPanel({ month, year }: { month: number; year: number }) {
  const [data, setData] = useState<OrdersAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await adminFetch(
          `/api/admin/analytics/orders?month=${month}&year=${year}`,
        );
        if (!r.ok) throw new Error("bad response");
        const d = (await r.json()) as OrdersAnalyticsData;
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-base-content/50">
        {MONTHS[month - 1]} {year}. Revenue below is product subtotal minus
        discounts; averages use grand total including shipping and tax where
        recorded.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner" />
        </div>
      ) : !data ? (
        <p className="text-sm text-error">Could not load order analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Paid orders</h3>
                <p className="text-2xl font-bold">
                  {data.paidOrderCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Revenue (product)</h3>
                <p className="text-2xl font-bold">
                  {fmtMoney(data.revenueProductCents / 100)}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Avg order total</h3>
                <p className="text-2xl font-bold">
                  {fmtMoney(data.avgGrandTotalCents / 100)}
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  Low {fmtMoney(data.minGrandTotalCents / 100)} / High{" "}
                  {fmtMoney(data.maxGrandTotalCents / 100)}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">Products sold (paid orders)</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">No paid orders.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Units</th>
                        <th className="text-right">Revenue</th>
                        <th className="text-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.productId}>
                          <td>
                            <Link
                              href={`/admin/products/${p.productId}`}
                              className="link link-hover">
                              {p.name}
                            </Link>
                          </td>
                          <td className="text-right">{p.units}</td>
                          <td className="text-right">
                            {fmtMoney(p.revenueCents / 100)}
                          </td>
                          <td className="text-right">{p.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">Recent paid orders</h2>
              {data.recentPaid.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">
                  No paid orders in this month.
                </p>
              ) : (
                <OrderActivityTable rows={data.recentPaid} showVisitor={false} />
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">
                Checkout started — not paid
              </h2>
              {data.recentPendingCheckout.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">
                  No pending orders this month.
                </p>
              ) : (
                <OrderActivityTable
                  rows={data.recentPendingCheckout}
                  showVisitor
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderActivityTable({
  rows,
  showVisitor,
}: {
  rows: OrderActivityRow[];
  showVisitor: boolean;
}) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Status</th>
            <th>Items</th>
            <th className="text-right">Total</th>
            {showVisitor && <th>Visitor</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const lineTotal = item.lineItems.reduce(
              (sum, li) => sum + li.price * li.quantity,
              0,
            );
            const itemSummary = item.lineItems
              .map((li) => `${li.product?.name ?? "Product"} ×${li.quantity}`)
              .join(", ");
            const displayTotal =
              item.grandTotalCents > 0
                ? item.grandTotalCents
                : lineTotal;
            return (
              <tr key={item._id}>
                <td className="font-mono text-xs text-base-content/60">
                  #{String(item._id).slice(-6).toUpperCase()}
                </td>
                <td className="text-sm">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      item.status === "processing" || item.status === "paid"
                        ? "badge-success"
                        : item.status === "shipped"
                          ? "badge-info"
                          : item.status === "delivered"
                            ? "badge-primary"
                            : item.status === "cancelled"
                              ? "badge-error"
                              : item.status === "pending"
                                ? "badge-warning"
                                : "badge-ghost"
                    }`}>
                    {item.status}
                  </span>
                </td>
                <td
                  className="text-sm max-w-[200px] truncate"
                  title={itemSummary}>
                  {itemSummary}
                </td>
                <td className="text-right font-medium">
                  {fmtMoney(displayTotal / 100)}
                </td>
                {showVisitor && (
                  <td
                    className="text-sm max-w-[140px] truncate"
                    title={
                      [item.userAgent, item.ipAddress, item.referer]
                        .filter(Boolean)
                        .join(" | ") || undefined
                    }>
                    {formatVisitorInfo(item)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
