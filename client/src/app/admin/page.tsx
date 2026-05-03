"use client";

import { useState } from "react";
import { MONTHS } from "@/lib/admin-analytics-client";
import { SiteActivityPanel } from "@/components/admin/analytics/SiteActivityPanel";
import { CartsPanel } from "@/components/admin/analytics/CartsPanel";
import { OrdersPanel } from "@/components/admin/analytics/OrdersPanel";

type MainTab = "site" | "carts" | "orders";

export default function AdminPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [mainTab, setMainTab] = useState<MainTab>("site");

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-base-content/80">
            Store engagement and commerce metrics for{" "}
            <span className="font-medium text-base-content">
              {MONTHS[month - 1]} {year}
            </span>
            .
          </p>
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
