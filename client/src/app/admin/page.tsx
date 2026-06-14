"use client";

import { useMemo, useState } from "react";
import { MONTHS } from "@/lib/admin-analytics-client";
import { SiteActivityPanel } from "@/components/admin/analytics/SiteActivityPanel";
import { CartsPanel } from "@/components/admin/analytics/CartsPanel";
import { OrdersPanel } from "@/components/admin/analytics/OrdersPanel";

type MainTab = "site" | "carts" | "orders";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function AdminPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [mainTab, setMainTab] = useState<MainTab>("site");

  const periodLabel = useMemo(
    () => `${MONTHS[month - 1]} ${year}`,
    [month, year],
  );

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="mt-1 text-base-content/80">
                Store engagement and commerce metrics for{" "}
                <span className="font-medium text-base-content">
                  {periodLabel}
                </span>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="form-control w-full min-w-[9rem] sm:w-40">
                <span className="label py-0 pb-1">
                  <span className="label-text text-xs">Month</span>
                </span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full min-w-[6rem] sm:w-28">
                <span className="label py-0 pb-1">
                  <span className="label-text text-xs">Year</span>
                </span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed flex-wrap">
        <button
          type="button"
          className={`tab ${mainTab === "site" ? "tab-active" : ""}`}
          onClick={() => setMainTab("site")}>
          Site activity
        </button>
        <button
          type="button"
          className={`tab ${mainTab === "carts" ? "tab-active" : ""}`}
          onClick={() => setMainTab("carts")}>
          Carts
        </button>
        <button
          type="button"
          className={`tab ${mainTab === "orders" ? "tab-active" : ""}`}
          onClick={() => setMainTab("orders")}>
          Orders
        </button>
      </div>

      {mainTab === "site" && <SiteActivityPanel month={month} year={year} />}
      {mainTab === "carts" && <CartsPanel month={month} year={year} />}
      {mainTab === "orders" && <OrdersPanel month={month} year={year} />}
    </div>
  );
}
