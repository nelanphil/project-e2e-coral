"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";

type ActivityTab = "paid" | "cart" | "checkedOut";

interface OrderActivity {
  type: "order";
  _id: string;
  status: string;
  createdAt: string;
  lineItems: {
    product: { name: string } | null;
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
}

interface CartActivity {
  type: "cart";
  _id: string;
  sessionId: string;
  lastActivityAt: string;
  lineItems: {
    product: { name: string } | null;
    quantity: number;
    price: number;
  }[];
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geoCity?: string;
  geoRegion?: string;
  geoCountry?: string;
}

type ActivityItem = OrderActivity | CartActivity;

interface Stats {
  totalOrders: number;
  totalProducts: number;
  inStockProducts: number;
  totalCategories: number;
  revenue: number;
  recentActivity: ActivityItem[];
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const adminFetch = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const LOCALHOST_IPS = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|localhost)$/i;

function formatVisitorInfo(item: ActivityItem): string {
  const parts: string[] = [];
  if (item.geoCity || item.geoRegion) {
    parts.push([item.geoCity, item.geoRegion].filter(Boolean).join(", "));
  }
  if (item.geoCountry) parts.push(item.geoCountry);
  if (parts.length > 0) return parts.join(", ");
  if (item.ipAddress) {
    return LOCALHOST_IPS.test(item.ipAddress.trim()) ? "Local" : item.ipAddress;
  }
  return "—";
}

export default function AdminPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [year, setYear] = useState(now.getFullYear());
  const [activityTab, setActivityTab] = useState<ActivityTab>("paid");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = now.getFullYear();
  const years = Array.from(
    { length: 5 },
    (_, i) => currentYear - 4 + i + 1,
  ).reverse();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoading(true);
      try {
        const r = await adminFetch(
          `/api/admin/stats?month=${month}&year=${year}&activityTab=${activityTab}`,
        );
        const d = await r.json();
        if (!cancelled) {
          setStats(d);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year, activityTab]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const statCards = [
    { label: "Orders", value: stats?.totalOrders ?? 0, isMoney: false },
    {
      label: "Products In Stock",
      value: stats?.inStockProducts ?? 0,
      isMoney: false,
    },
    { label: "All Products", value: stats?.totalProducts ?? 0, isMoney: false },
    { label: "Categories", value: stats?.totalCategories ?? 0, isMoney: false },
    { label: "Revenue", value: (stats?.revenue ?? 0) / 100, isMoney: true },
  ];

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-base-content/80">
            Overview for store management.
          </p>
        </div>
      </div>

      {/* Month / Year filter */}
      <div className="flex items-center justify-center gap-3">
        <button className="btn btn-sm btn-ghost" onClick={prevMonth}>
          &#8249;
        </button>

        <span className="text-base font-semibold min-w-[120px] text-center">
          {MONTHS[month - 1]}
        </span>

        <button
          className="btn btn-sm btn-ghost"
          onClick={nextMonth}
          disabled={isCurrentMonth}>
          &#8250;
        </button>

        <select
          className="select select-sm select-bordered w-[90px]"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, isMoney }) => (
          <div key={label} className="card bg-base-100 shadow">
            <div className="card-body items-center text-center">
              <h3 className="card-title text-sm font-medium text-base-content/70 justify-center">
                {label}
              </h3>
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <p className="text-2xl font-bold">
                  {isMoney ? fmtMoney(value) : value.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Recent activity</h2>
          <p className="text-xs text-base-content/50 -mt-1">
            {MONTHS[month - 1]} {year}
          </p>

          <div className="tabs tabs-boxed mt-2 mb-2">
            <button
              className={`tab ${activityTab === "paid" ? "tab-active" : ""}`}
              onClick={() => setActivityTab("paid")}>
              Paid
            </button>
            <button
              className={`tab ${activityTab === "cart" ? "tab-active" : ""}`}
              onClick={() => setActivityTab("cart")}>
              Cart
            </button>
            <button
              className={`tab ${activityTab === "checkedOut" ? "tab-active" : ""}`}
              onClick={() => setActivityTab("checkedOut")}>
              Checked Out Not Paid
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : !stats?.recentActivity?.length ? (
            <p className="text-sm text-base-content/60 py-4">
              {activityTab === "paid" &&
                `No paid orders in ${MONTHS[month - 1]} ${year}.`}
              {activityTab === "cart" &&
                `No abandoned carts in ${MONTHS[month - 1]} ${year}.`}
              {activityTab === "checkedOut" &&
                `No checkout attempts without payment in ${MONTHS[month - 1]} ${year}.`}
            </p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    {(activityTab === "cart" ||
                      activityTab === "checkedOut") && <th>Visitor</th>}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((item) => {
                    const totalCents = item.lineItems.reduce(
                      (sum, li) => sum + li.price * li.quantity,
                      0,
                    );
                    const itemSummary = item.lineItems
                      .map(
                        (li) =>
                          `${li.product?.name ?? "Product"} ×${li.quantity}`,
                      )
                      .join(", ");
                    const date =
                      item.type === "order"
                        ? item.createdAt
                        : item.lastActivityAt;
                    const id =
                      item.type === "order" ? item._id : item.sessionId;
                    const status = item.type === "order" ? item.status : "cart";
                    return (
                      <tr
                        key={item.type === "order" ? item._id : item.sessionId}>
                        <td className="font-mono text-xs text-base-content/60">
                          #{id.slice(-6).toUpperCase()}
                        </td>
                        <td className="text-sm">
                          {new Date(date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm ${
                              status === "paid"
                                ? "badge-success"
                                : status === "shipped"
                                  ? "badge-info"
                                  : status === "delivered"
                                    ? "badge-primary"
                                    : status === "cancelled"
                                      ? "badge-error"
                                      : status === "cart"
                                        ? "badge-ghost"
                                        : "badge-ghost"
                            }`}>
                            {status}
                          </span>
                        </td>
                        <td
                          className="text-sm max-w-[200px] truncate"
                          title={itemSummary}>
                          {itemSummary}
                        </td>
                        <td className="text-right font-medium">
                          {fmtMoney(totalCents / 100)}
                        </td>
                        {(activityTab === "cart" ||
                          activityTab === "checkedOut") && (
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
          )}
        </div>
      </div>
    </div>
  );
}
