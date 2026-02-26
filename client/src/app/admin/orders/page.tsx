"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";

interface OrderRow {
  _id: string;
  status: string;
  trackingNumber?: string;
  createdAt: string;
  lineItems: { product: { name: string }; quantity: number; price: number }[];
  shippingAddress: { line1: string; city: string; state: string };
}

const api = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/admin/orders").then((r) => r.json()).then((d) => {
      setOrders(d.orders ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="mt-1 text-base-content/80">
              View and manage customer orders and shipments.
            </p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Date</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td className="font-mono text-xs">{o._id.slice(-8)}</td>
                    <td><span className="badge">{o.status}</span></td>
                    <td>{o.trackingNumber ?? "—"}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.shippingAddress?.line1}, {o.shippingAddress?.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
