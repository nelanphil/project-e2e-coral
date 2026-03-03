"use client";

import type { AdminOrderCounts } from "@/lib/types";

interface StatusCard {
  key: string;
  label: string;
  value: number | string;
  color: string;
  filterValue: string;
}

interface Props {
  counts: AdminOrderCounts;
  revenue: number;
  activeFilter: string;
  onFilterChange: (status: string) => void;
}

export default function OrderStatusCards({
  counts,
  revenue,
  activeFilter,
  onFilterChange,
}: Props) {
  const cards: StatusCard[] = [
    {
      key: "total",
      label: "Total Orders",
      value: counts.total,
      color: "bg-base-100 border-base-300",
      filterValue: "",
    },
    {
      key: "pending",
      label: "Pending",
      value: counts.pending,
      color: "bg-warning/20 border-warning text-warning",
      filterValue: "pending",
    },
    {
      key: "processing",
      label: "Processing",
      value: counts.processing,
      color: "bg-info/20 border-info text-info",
      filterValue: "processing",
    },
    {
      key: "shipped",
      label: "Shipped",
      value: counts.shipped,
      color: "bg-primary/20 border-primary text-primary",
      filterValue: "shipped",
    },
    {
      key: "delivered",
      label: "Delivered",
      value: counts.delivered,
      color: "bg-success/20 border-success text-success",
      filterValue: "delivered",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: counts.cancelled,
      color: "bg-error/20 border-error text-error",
      filterValue: "cancelled",
    },
    {
      key: "refunded",
      label: "Refunded",
      value: counts.refunded,
      color: "bg-secondary/20 border-secondary text-secondary",
      filterValue: "refunded",
    },
    {
      key: "revenue",
      label: "Revenue",
      value: `$${(revenue / 100).toFixed(2)}`,
      color: "bg-accent/20 border-accent text-accent",
      filterValue: "__revenue__",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.filterValue;
        const isClickable = card.filterValue !== "__revenue__";
        return (
          <button
            key={card.key}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onFilterChange(card.filterValue)}
            className={`rounded-xl border-2 px-3 py-3 text-center transition-all ${
              card.color
            } ${
              isActive
                ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105"
                : ""
            } ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"}`}>
            <div className="text-xs font-medium opacity-80">{card.label}</div>
            <div className="text-2xl font-bold mt-1">{card.value}</div>
          </button>
        );
      })}
    </div>
  );
}
