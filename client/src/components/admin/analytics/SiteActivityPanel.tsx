"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { adminFetch, MONTHS } from "@/lib/admin-analytics-client";

export interface UsaContinentalData {
  note: string;
  uniqueVisitorsTotal: number;
  statesWithActivity: number;
  byState: { state: string; uniqueVisitors: number }[];
}

export interface SiteActivityData {
  disclaimer: string;
  disclaimerTooltip: string;
  uniqueCustomers: number;
  uniqueGuests: number;
  visitorBreakdown?: {
    customers: number;
    anonymousVisitors: number;
    guestProfiles: number;
    adminVisitors: number;
  };
  cartsTouched: number;
  ordersCreated: number;
  ordersPaid: number;
  usaContinental: UsaContinentalData;
}

type SortKey = "state" | "visits";
type SortDir = "asc" | "desc";

export function SiteActivityPanel({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const [data, setData] = useState<SiteActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("state");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await adminFetch(
          `/api/admin/analytics/site-activity?month=${month}&year=${year}`,
        );
        if (!r.ok) throw new Error("bad response");
        const d = (await r.json()) as SiteActivityData;
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "state" ? "asc" : "desc");
    }
  };

  const sortedStates = useMemo(() => {
    const rows = data?.usaContinental?.byState ?? [];
    const out = [...rows];
    out.sort((a, b) => {
      if (sortKey === "state") {
        const cmp = a.state.localeCompare(b.state, undefined, {
          sensitivity: "base",
        });
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = a.uniqueVisitors - b.uniqueVisitors;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [data?.usaContinental?.byState, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  const thSortClass =
    "cursor-pointer select-none hover:bg-base-200/80 transition-colors";

  const cards = data
    ? [
        {
          label: "Unique customers",
          value:
            data.visitorBreakdown?.customers ?? data.uniqueCustomers,
          hint: "Registered customer accounts with storefront activity this month",
        },
        {
          label: "Anonymous visitors",
          value: data.visitorBreakdown?.anonymousVisitors ?? 0,
          hint: "No logged-in user; keyed by browser visitor id, cart session, or IP + browser fingerprint",
        },
        {
          label: "Guest checkout profiles",
          value: data.visitorBreakdown?.guestProfiles ?? 0,
          hint: "Logged-in guest-role accounts (saved checkout profile), distinct users",
        },
        {
          label: "Admin visits",
          value: data.visitorBreakdown?.adminVisitors ?? 0,
          hint: "Distinct admin users with storefront activity (testing / operations)",
        },
        {
          label: "Carts touched",
          value: data.cartsTouched,
          hint: "Cart sessions with any activity this month",
        },
        {
          label: "Orders created",
          value: data.ordersCreated,
          hint: "All new orders (any status)",
        },
        {
          label: "Paid orders",
          value: data.ordersPaid,
          hint: "Orders marked paid (processing, shipped, delivered)",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70 max-w-3xl flex flex-wrap items-baseline gap-x-1 gap-y-0 overflow-visible">
        <span>
          {MONTHS[month - 1]} {year}.{" "}
          {loading
            ? "Loading…"
            : data?.disclaimer ??
              "Site activity metrics use the SiteActivityLog store (deduped daily per customer or per guest key)."}
        </span>
        {!loading && data?.disclaimerTooltip ? (
          <span
            className="tooltip tooltip-top z-50 inline-block shrink-0 align-middle before:z-50 after:z-50"
            data-tip={data.disclaimerTooltip}>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square min-h-6 h-6 w-6 p-0"
              aria-label="More about site activity metrics and TRUST_PROXY">
              <Info className="size-4 text-base-content/50" />
            </button>
          </span>
        ) : null}
      </p>

      {!loading && data?.uniqueGuests != null ? (
        <p className="text-xs text-base-content/60 -mt-2">
          Combined non-customer visitors (anonymous + guest profiles):{" "}
          <span className="font-medium tabular-nums">
            {data.uniqueGuests.toLocaleString()}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="card bg-base-100 shadow">
                <div className="card-body items-center">
                  <span className="loading loading-spinner loading-sm" />
                </div>
              </div>
            ))
          : !data
            ? (
              <p className="text-sm text-error col-span-full">
                Could not load site activity.
              </p>
            )
            : cards.map(({ label, value, hint }) => (
              <div key={label} className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3
                    className="text-sm font-medium text-base-content/70"
                    title={hint}>
                    {label}
                  </h3>
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                </div>
              </div>
            ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Continental US · unique visitors
        </h2>
        <p className="text-xs text-base-content/60 max-w-3xl">
          {loading
            ? "Loading…"
            : data?.usaContinental.note ??
              "Lower 48 + D.C., from IP geo on cart and order events."}
        </p>

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body">
                  <h3 className="text-sm font-medium text-base-content/70">
                    Unique visitors (continental US)
                  </h3>
                  <p className="text-3xl font-bold tabular-nums">
                    {data.usaContinental.uniqueVisitorsTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-base-content/50">
                    Distinct visitors across all included states (not a sum of
                    per-state counts).
                  </p>
                </div>
              </div>
              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body">
                  <h3 className="text-sm font-medium text-base-content/70">
                    States with activity
                  </h3>
                  <p className="text-3xl font-bold tabular-nums">
                    {data.usaContinental.statesWithActivity.toLocaleString()}
                  </p>
                  <p className="text-xs text-base-content/50">
                    States with at least one attributed visitor this period.
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-base font-semibold">
                  By state
                </h3>
                {data.usaContinental.byState.length === 0 ? (
                  <p className="text-sm text-base-content/60 py-4">
                    No continental US geo data for this period (IP lookup may be
                    missing or all traffic was outside the lower 48).
                  </p>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th scope="col">
                            <button
                              type="button"
                              className={`font-semibold ${thSortClass} px-2 py-1 -mx-2 -my-1 rounded`}
                              onClick={() => toggleSort("state")}>
                              State{sortIndicator("state")}
                            </button>
                          </th>
                          <th scope="col" className="text-right align-bottom">
                            <button
                              type="button"
                              className={`font-semibold ${thSortClass} px-2 py-1 -mx-2 -my-1 rounded inline-block w-full text-right`}
                              onClick={() => toggleSort("visits")}>
                              Unique visits{sortIndicator("visits")}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStates.map((row) => (
                          <tr key={row.state}>
                            <td className="font-medium">{row.state}</td>
                            <td className="text-right tabular-nums">
                              {row.uniqueVisitors.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-base-content/50">
        Revenue and product KPIs appear under the Orders tab. Abandoned cart
        detail appears under Carts.
      </p>
    </div>
  );
}
