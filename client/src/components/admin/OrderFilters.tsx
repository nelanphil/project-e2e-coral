"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  onRefresh: () => void;
}

export default function OrderFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onRefresh,
}: Props) {
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync from parent when search is cleared externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="label pb-1">
              <span className="label-text text-xs font-medium">Search</span>
            </label>
            <label className="input input-bordered input-sm flex items-center gap-2">
              <Search className="size-4 opacity-50" />
              <input
                type="text"
                className="grow"
                placeholder="Order #, customer name, or email"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </label>
          </div>

          {/* Fulfillment Status */}
          <div>
            <label className="label pb-1">
              <span className="label-text text-xs font-medium">
                Fulfillment Status
              </span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="label pb-1">
              <span className="label-text text-xs font-medium">
                Payment Status
              </span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value)}>
              <option value="">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="label pb-1">
              <span className="label-text text-xs font-medium">From Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div>
            <label className="label pb-1">
              <span className="label-text text-xs font-medium">To Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onRefresh}
            aria-label="Refresh">
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
