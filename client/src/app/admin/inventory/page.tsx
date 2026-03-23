"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import OrdersPagination from "@/components/admin/OrdersPagination";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Store } from "lucide-react";

interface InventoryRow {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    cost: number;
    isActive?: boolean;
  };
  quantity: number;
}

type SortField = "name" | "price" | "cost" | "quantity" | "updatedAt";
type SortOrder = "asc" | "desc";

const api = (path: string, options?: RequestInit) => {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";
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

function SortIcon({
  field,
  currentField,
  order,
}: {
  field: SortField;
  currentField: SortField;
  order: SortOrder;
}) {
  if (field !== currentField) {
    return <ArrowUpDown className="inline-block w-3.5 h-3.5 ml-1 opacity-50" />;
  }
  return order === "asc" ? (
    <ArrowUp className="inline-block w-3.5 h-3.5 ml-1" />
  ) : (
    <ArrowDown className="inline-block w-3.5 h-3.5 ml-1" />
  );
}

function StoreSlashIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className ?? ""}`} title={title}>
      <Store className="w-4 h-4" />
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-5 h-px bg-current rotate-45 opacity-90" />
      </span>
    </span>
  );
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const res = await api(`/api/admin/inventory?${params}`);
      const data = await res.json();
      setInventory(data.inventory ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortField, sortOrder]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Debounced auto-search
  useEffect(() => {
    const trimmed = searchInput.trim();
    const timer = setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

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
          {/* Search and pagination */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by product name..."
              className="input input-bordered input-sm w-64"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <OrdersPagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            emptyMessage="No inventory found"
          />

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="flex items-center hover:text-primary"
                      onClick={() => handleSort("name")}>
                      Product
                      <SortIcon
                        field="name"
                        currentField={sortField}
                        order={sortOrder}
                      />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="flex items-center hover:text-primary"
                      onClick={() => handleSort("price")}>
                      Price
                      <SortIcon
                        field="price"
                        currentField={sortField}
                        order={sortOrder}
                      />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="flex items-center hover:text-primary"
                      onClick={() => handleSort("cost")}>
                      Cost
                      <SortIcon
                        field="cost"
                        currentField={sortField}
                        order={sortOrder}
                      />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="flex items-center hover:text-primary"
                      onClick={() => handleSort("quantity")}>
                      Qty
                      <SortIcon
                        field="quantity"
                        currentField={sortField}
                        order={sortOrder}
                      />
                    </button>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <span className="loading loading-spinner" />
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/70">
                      No inventory found
                    </td>
                  </tr>
                ) : (
                  inventory.map((row) => {
                    const isVisible = row.product?.isActive !== false;
                    const isOutOfStock = row.quantity === 0;
                    return (
                    <tr
                      key={row._id}
                      className={isOutOfStock ? "bg-warning/15" : undefined}>
                      <td>
                        <span className="flex items-center gap-2">
                          {row.product?.name ?? "—"}
                          {isVisible ? (
                            <span
                              className="tooltip tooltip-right shrink-0"
                              data-tip="Visible in store">
                              <Eye className="w-4 h-4 text-success" />
                            </span>
                          ) : (
                            <span
                              className="tooltip tooltip-right shrink-0"
                              data-tip="Hidden from store">
                              <EyeOff className="w-4 h-4 text-base-content/40" />
                            </span>
                          )}
                          {isOutOfStock && (
                            <StoreSlashIcon
                              className="text-warning"
                              title="Not shown in store (0 quantity)"
                            />
                          )}
                        </span>
                      </td>
                      <td>${((row.product?.price ?? 0) / 100).toFixed(2)}</td>
                      <td>${((row.product?.cost ?? 0) / 100).toFixed(2)}</td>
                      <td className={isOutOfStock ? "font-semibold text-warning" : undefined}>
                        {row.quantity}
                      </td>
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
                  );
                  })
                )}
              </tbody>
            </table>
          </div>

          <OrdersPagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            emptyMessage="No inventory found"
          />
        </div>
      </div>
    </div>
  );
}
