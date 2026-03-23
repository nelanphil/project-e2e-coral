"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Globe,
  Award,
  Eye,
  Package,
  ShieldCheck,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import type { AdminUserDetailResponse, AdminOrder } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    admin: "badge-error",
    customer: "badge-primary",
    guest: "badge-ghost",
  };
  return map[role] ?? "badge-ghost";
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "badge-warning",
    processing: "badge-info",
    paid: "badge-success",
    shipped: "badge-primary",
    delivered: "badge-success",
    cancelled: "badge-error",
    refunded: "badge-secondary",
  };
  return map[status] ?? "badge-ghost";
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

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      const json = (await res.json()) as AdminUserDetailResponse;
      setData(json);
    } catch {
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="size-4" /> Back to Users
        </Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { user, orders, totalOrders, totalSpent } = data;

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="btn btn-ghost btn-sm gap-2">
        <ArrowLeft className="size-4" /> Back to Users
      </Link>

      {/* User header */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "Unnamed User"}
                </h1>
                <span className={`badge ${getRoleBadge(user.role)}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
              {user.email && (
                <p className="text-sm text-base-content/60 mt-1 flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {user.email}
                </p>
              )}
            </div>
            <div className="text-sm text-base-content/60 flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Joined{" "}
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: stats + orders */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-sm text-base-content/60">Total Orders</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <div className="text-2xl font-bold">
                  {formatCents(totalSpent)}
                </div>
                <p className="text-sm text-base-content/60">Total Spent</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <div className="flex items-center gap-1.5 text-2xl font-bold">
                  <Award className="size-5 text-warning" />
                  {user.pointsBalance ?? 0}
                </div>
                <p className="text-sm text-base-content/60">Reward Points</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <div className="text-2xl font-bold">{user.visitCount ?? 0}</div>
                <p className="text-sm text-base-content/60">Visits</p>
              </div>
            </div>
          </div>

          {/* Order history */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Package className="size-5" /> Order History
              </h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  No orders yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th className="text-center">Items</th>
                        <th className="text-right">Total</th>
                        <th className="text-center">Status</th>
                        <th>Date</th>
                        <th className="text-center">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const total = computeTotal(order);
                        const itemCount = order.lineItems.reduce(
                          (sum, li) => sum + li.quantity,
                          0,
                        );
                        return (
                          <tr key={order._id} className="hover">
                            <td>
                              <span className="font-mono text-xs font-semibold">
                                {order.orderNumber ?? order._id.slice(-8)}
                              </span>
                            </td>
                            <td className="text-center text-sm">{itemCount}</td>
                            <td className="text-right font-medium">
                              {formatCents(total)}
                            </td>
                            <td className="text-center">
                              <span
                                className={`badge badge-sm ${getStatusBadge(order.status)}`}
                              >
                                {order.status.charAt(0).toUpperCase() +
                                  order.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className="text-sm">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                            </td>
                            <td className="text-center">
                              <Link
                                href={`/admin/orders/${order._id}`}
                                className="btn btn-ghost btn-xs btn-square"
                                aria-label="View order"
                              >
                                <Eye className="size-4" />
                              </Link>
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
        </div>

        {/* Right column: user details */}
        <div className="space-y-4">
          {/* Account info */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-lg">
                <ShieldCheck className="size-5" /> Account Info
              </h2>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-base-content/60">User ID</span>
                  <span className="font-mono text-xs">{user._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Role</span>
                  <span className={`badge badge-sm ${getRoleBadge(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Created</span>
                  <span>
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Updated</span>
                  <span>
                    {new Date(user.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {user.lastVisit && (
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Last Visit</span>
                    <span>
                      {new Date(user.lastVisit).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visitor metadata */}
          {(user.ipAddress || user.referrer) && (
            <div className="collapse collapse-arrow bg-base-100 shadow">
              <input type="checkbox" />
              <div className="collapse-title font-medium flex items-center gap-2">
                <Globe className="size-4" /> Visitor Metadata
              </div>
              <div className="collapse-content text-sm space-y-1">
                {user.ipAddress && (
                  <div>
                    <span className="text-base-content/60">IP: </span>
                    {user.ipAddress}
                  </div>
                )}
                {user.userAgent && (
                  <div>
                    <span className="text-base-content/60">User Agent: </span>
                    <span className="text-xs break-all">{user.userAgent}</span>
                  </div>
                )}
                {user.referrer && (
                  <div>
                    <span className="text-base-content/60">Referrer: </span>
                    <span className="text-xs break-all">{user.referrer}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
