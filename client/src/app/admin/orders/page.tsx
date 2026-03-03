"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuthToken } from "@/lib/auth";
import type { AdminOrdersResponse, AdminOrderCounts } from "@/lib/types";
import OrderStatusCards from "@/components/admin/OrderStatusCards";
import OrderFilters from "@/components/admin/OrderFilters";
import OrdersPagination from "@/components/admin/OrdersPagination";
import AdminOrdersTable from "@/components/admin/AdminOrdersTable";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

const emptyCounts: AdminOrderCounts = {
  total: 0,
  pending: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
  refunded: 0,
};

export default function AdminOrdersPage() {
  const [data, setData] = useState<AdminOrdersResponse>({
    orders: [],
    total: 0,
    page: 1,
    limit: 50,
    counts: emptyCounts,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const res = await fetch(`${BASE_URL}/api/admin/orders?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const json = (await res.json()) as AdminOrdersResponse;
      setData(json);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, paymentStatus, fromDate, toDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusCardClick = (filterValue: string) => {
    setStatus(filterValue);
    setPage(1);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatus(value);
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <OrderStatusCards
        counts={data.counts}
        revenue={data.revenue}
        activeFilter={status}
        onFilterChange={handleStatusCardClick}
      />

      {/* Filters */}
      <OrderFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={handlePaymentStatusChange}
        fromDate={fromDate}
        onFromDateChange={handleFromDateChange}
        toDate={toDate}
        onToDateChange={handleToDateChange}
        onRefresh={fetchOrders}
      />

      {/* Orders Table with Pagination top and bottom */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          {/* Top Pagination */}
          <OrdersPagination
            page={page}
            limit={limit}
            total={data.total}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
          />

          {/* Table */}
          <AdminOrdersTable orders={data.orders} loading={loading} />

          {/* Bottom Pagination */}
          <OrdersPagination
            page={page}
            limit={limit}
            total={data.total}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>
    </div>
  );
}
