"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";

interface InventoryRow {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    cost: number;
  };
  quantity: number;
}

const api = (path: string, options?: RequestInit) => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
  const token = getAuthToken();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
};

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/admin/inventory")
      .then((r) => r.json())
      .then((d) => setInventory(d.inventory ?? []))
      .finally(() => setLoading(false));
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
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="mt-1 text-base-content/80">
              Current stock levels for all products.
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
                  <th>Product</th>
                  <th>Price</th>
                  <th>Cost</th>
                  <th>Qty</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr key={row._id}>
                    <td>{row.product?.name ?? "—"}</td>
                    <td>${((row.product?.price ?? 0) / 100).toFixed(2)}</td>
                    <td>${((row.product?.cost ?? 0) / 100).toFixed(2)}</td>
                    <td>{row.quantity}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/inventory/${row.product?._id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          Logs
                        </Link>
                        <Link
                          href={`/admin/products/${row.product?._id}?tab=inventory&returnTo=/admin/inventory`}
                          className="btn btn-ghost btn-xs"
                        >
                          Adjustment
                        </Link>
                      </div>
                    </td>
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
