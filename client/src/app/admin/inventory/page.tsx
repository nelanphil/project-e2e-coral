"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";

type InventoryFilter = "all" | "inStock" | "outOfStock" | "lowStock";

interface InventoryRow {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    cost: number;
    isActive?: boolean;
    deletedAt?: string | null;
  };
  quantity: number;
}

const PAGE_SIZE_OPTIONS = [50, 150, 250];

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
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { inStockCount, outOfStockCount, lowStockCount, filteredInventory } =
    useMemo(() => {
      const inStock = inventory.filter((row) => row.quantity > 0);
      const outOfStock = inventory.filter((row) => row.quantity === 0);
      const lowStock = inventory.filter((row) => row.quantity === 1);
      // In stock = unique active, non-deleted products with quantity >= 1 (matches store)
      const isStoreVisible = (row: InventoryRow) =>
        row.product?.isActive !== false && row.product?.deletedAt == null;
      const inStockProductIds = new Set(
        inStock
          .filter(isStoreVisible)
          .map((row) => row.product?._id)
          .filter(Boolean)
      );
      const inStockActive = inStock.filter(isStoreVisible);
      let filtered: InventoryRow[] = inventory;
      if (filter === "inStock") filtered = inStockActive;
      else if (filter === "outOfStock") filtered = outOfStock;
      else if (filter === "lowStock") filtered = lowStock;
      return {
        inStockCount: inStockProductIds.size,
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        filteredInventory: filtered,
      };
    }, [inventory, filter]);

  const searchFilteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredInventory;
    return filteredInventory.filter((row) =>
      (row.product?.name ?? "").toLowerCase().includes(q)
    );
  }, [filteredInventory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(searchFilteredInventory.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searchFilteredInventory.slice(start, start + pageSize);
  }, [searchFilteredInventory, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize, searchQuery]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFilterClick = (next: InventoryFilter) => {
    setFilter((prev) => (prev === next ? "all" : next));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  useEffect(() => {
    api("/api/admin/inventory")
      .then((r) => r.json())
      .then((d) => setInventory(d.inventory ?? []))
      .finally(() => setLoading(false));
  }, []);

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search products..."
          className="input input-bordered input-sm w-40 sm:w-52"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm whitespace-nowrap">Rows per page:</span>
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            «
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
            .map((p, idx, arr) => {
              const prevPage = arr[idx - 1];
              const showEllipsis = prevPage != null && p - prevPage > 1;
              return (
                <span key={p}>
                  {showEllipsis && (
                    <button type="button" className="join-item btn btn-sm btn-disabled" disabled>
                      ...
                    </button>
                  )}
                  <button
                    type="button"
                    className={`join-item btn btn-sm ${page === p ? "btn-active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </span>
              );
            })}
          <button
            className="join-item btn btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            »
          </button>
        </div>
      )}

      <div className="w-[140px]" />
    </div>
  );

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleFilterClick("inStock")}
            className={`card card-compact bg-base-100 shadow text-center transition-all ${
              filter === "inStock" ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
          >
            <div className="card-body items-center py-3 px-4">
              <h3 className="card-title text-sm font-medium text-base-content/70 justify-center">
                In stock
              </h3>
              <p className="text-xl font-bold">{inStockCount}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("outOfStock")}
            className={`card card-compact bg-base-100 shadow text-center transition-all ${
              filter === "outOfStock" ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
          >
            <div className="card-body items-center py-3 px-4">
              <h3 className="card-title text-sm font-medium text-base-content/70 justify-center">
                Out of stock
              </h3>
              <p className="text-xl font-bold">{outOfStockCount}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("lowStock")}
            className={`card card-compact bg-base-100 shadow text-center transition-all ${
              filter === "lowStock" ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
          >
            <div className="card-body items-center py-3 px-4">
              <h3 className="card-title text-sm font-medium text-base-content/70 justify-center">
                Low stock
              </h3>
              <p className="text-xl font-bold">{lowStockCount}</p>
            </div>
          </button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <PaginationControls />
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
                {paginatedRows.map((row) => (
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
          <PaginationControls />
        </div>
      </div>
    </div>
  );
}
