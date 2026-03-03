"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { AdminOrder } from "@/lib/types";

interface Props {
  orders: AdminOrder[];
  loading?: boolean;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "badge-warning",
    processing: "badge-info",
    shipped: "badge-primary",
    delivered: "badge-success",
    cancelled: "badge-error",
    refunded: "badge-secondary",
  };
  return map[status] ?? "badge-ghost";
}

function getPaymentBadge(paymentStatus?: string) {
  const map: Record<string, string> = {
    unpaid: "badge-warning",
    paid: "badge-success",
    refunded: "badge-secondary",
  };
  return map[paymentStatus ?? ""] ?? "badge-ghost";
}

function computeTotal(order: AdminOrder): number {
  const lineItemTotal = order.lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity,
    0,
  );
  return (
    lineItemTotal +
    (order.taxAmount ?? 0) +
    (order.shippingAmount ?? 0) -
    (order.pointsDiscountCents ?? 0) -
    (order.discountAmountCents ?? 0)
  );
}

function computeSavings(order: AdminOrder): number {
  return (order.discountAmountCents ?? 0) + (order.pointsDiscountCents ?? 0);
}

function getCustomerDisplay(order: AdminOrder) {
  const user = order.user;
  if (user && user.name) {
    return {
      name: user.name,
      email: user.email,
      isGuest: user.role === "guest",
    };
  }
  return {
    name: order.email ?? "Unknown",
    email: order.email ?? "",
    isGuest: true,
  };
}

export default function AdminOrdersTable({ orders, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/60">
        No orders found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th className="text-center">Items</th>
            <th className="text-right">Total</th>
            <th className="text-right">Savings</th>
            <th className="text-center">Payment</th>
            <th className="text-center">Status</th>
            <th>Date</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const customer = getCustomerDisplay(order);
            const total = computeTotal(order);
            const savings = computeSavings(order);
            const itemCount = order.lineItems.reduce(
              (sum, li) => sum + li.quantity,
              0,
            );
            return (
              <tr key={order._id} className="hover">
                <td>
                  <div className="font-mono text-xs font-semibold">
                    {order.orderNumber ?? order._id.slice(-8)}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {customer.name}
                      {customer.isGuest && (
                        <span className="badge badge-ghost badge-xs ml-2">
                          Guest
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-base-content/60">
                      {customer.email}
                    </span>
                  </div>
                </td>
                <td className="text-center">
                  <span className="text-sm">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </td>
                <td className="text-right font-medium">{formatCents(total)}</td>
                <td className="text-right">
                  {savings > 0 ? (
                    <span className="text-success text-sm">
                      -{formatCents(savings)}
                    </span>
                  ) : (
                    <span className="text-base-content/40">-</span>
                  )}
                </td>
                <td className="text-center">
                  <span
                    className={`badge badge-sm ${getPaymentBadge(order.paymentStatus)}`}>
                    {(order.paymentStatus ?? "unpaid").charAt(0).toUpperCase() +
                      (order.paymentStatus ?? "unpaid").slice(1)}
                  </span>
                </td>
                <td className="text-center">
                  <span
                    className={`badge badge-sm ${getStatusBadge(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </span>
                </td>
                <td>
                  <div className="text-sm">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {new Date(order.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </td>
                <td className="text-center">
                  <Link
                    href={`/admin/orders/${order._id}`}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="View order details">
                    <Eye className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
