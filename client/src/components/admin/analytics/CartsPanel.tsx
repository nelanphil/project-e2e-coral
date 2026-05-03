"use client";

import { useEffect, useState } from "react";
import {
  adminFetch,
  fmtMoney,
  formatVisitorInfo,
  MONTHS,
} from "@/lib/admin-analytics-client";

export interface CartAnalyticsTopProduct {
  productId: string;
  name: string;
  quantity: number;
  cartCount: number;
}

export interface RecentAbandonedRow {
  type: "cart";
  _id: string;
  sessionId: string;
  lastActivityAt: string;
  lineItems: {
    product: { name: string };
    quantity: number;
    price: number;
  }[];
  subtotalCents: number;
  segment: "customer" | "guest";
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geoCity?: string;
  geoRegion?: string;
  geoCountry?: string;
}

export interface CartsAnalyticsData {
  abandonedCount: number;
  abandonedLoggedInCustomer: number;
  abandonedGuest: number;
  avgSubtotalCents: number;
  medianSubtotalCents: number;
  p90SubtotalCents: number;
  topProducts: CartAnalyticsTopProduct[];
  recentAbandoned: RecentAbandonedRow[];
}

export function CartsPanel({ month, year }: { month: number; year: number }) {
  const [data, setData] = useState<CartsAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await adminFetch(
          `/api/admin/analytics/carts?month=${month}&year=${year}`,
        );
        if (!r.ok) throw new Error("bad response");
        const d = (await r.json()) as CartsAnalyticsData;
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
        {MONTHS[month - 1]} {year}. Abandoned = items in cart this month with no
        paid order for the same cart session.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner" />
        </div>
      ) : !data ? (
        <p className="text-sm text-error">Could not load cart analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Abandoned carts</h3>
                <p className="text-2xl font-bold">
                  {data.abandonedCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Logged-in</h3>
                <p className="text-2xl font-bold">
                  {data.abandonedLoggedInCustomer.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Guests</h3>
                <p className="text-2xl font-bold">
                  {data.abandonedGuest.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="text-sm text-base-content/70">Avg cart value</h3>
                <p className="text-2xl font-bold">
                  {fmtMoney(data.avgSubtotalCents / 100)}
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  Median {fmtMoney(data.medianSubtotalCents / 100)} / P90{" "}
                  {fmtMoney(data.p90SubtotalCents / 100)}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">Top products in abandoned carts</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">No data.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Units</th>
                        <th className="text-right">Carts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.productId}>
                          <td>{p.name}</td>
                          <td className="text-right">{p.quantity}</td>
                          <td className="text-right">{p.cartCount}</td>
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
              <h2 className="card-title text-base">Recent abandoned carts</h2>
              {data.recentAbandoned.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">
                  No abandoned carts this month.
                </p>
              ) : (
                <div className="overflow-x-auto mt-2">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Segment</th>
                        <th>Items</th>
                        <th className="text-right">Subtotal</th>
                        <th>Visitor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAbandoned.map((item) => {
                        const itemSummary = item.lineItems
                          .map(
                            (li) =>
                              `${li.product?.name ?? "Product"} ×${li.quantity}`,
                          )
                          .join(", ");
                        return (
                          <tr key={`${item._id}-${item.sessionId}`}>
                            <td className="font-mono text-xs text-base-content/60">
                              #{item.sessionId.slice(-6).toUpperCase()}
                            </td>
                            <td className="text-sm">
                              {new Date(item.lastActivityAt).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </td>
                            <td>
                              <span className="badge badge-sm badge-ghost">
                                {item.segment}
                              </span>
                            </td>
                            <td
                              className="text-sm max-w-[200px] truncate"
                              title={itemSummary}>
                              {itemSummary}
                            </td>
                            <td className="text-right font-medium">
                              {fmtMoney(item.subtotalCents / 100)}
                            </td>
                            <td
                              className="text-sm max-w-[140px] truncate"
                              title={
                                [item.userAgent, item.ipAddress, item.referer]
                                  .filter(Boolean)
                                  .join(" | ") || undefined
                              }>
                              {formatVisitorInfo(item)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
