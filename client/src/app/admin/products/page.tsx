"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { revalidateCollections } from "@/app/actions/revalidate";
import { useProductStore } from "@/stores/product-store";
import type { Product, Collection } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";
import { getAuthToken } from "@/lib/auth";

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];
const SEARCH_DEBOUNCE_MS = 400;

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004";
}

function getCategoryId(p: Product): string {
  if (typeof p.category === "string") return p.category;
  return p.category?._id ?? "";
}

function getCollectionIds(p: Product): string[] {
  if (!p.collections) return [];
  return p.collections.map((c) => (typeof c === "string" ? c : c._id));
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function updateProductField(
  productId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${getApiUrl()}/api/products/${productId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

async function deleteProduct(productId: string) {
  const res = await fetch(`${getApiUrl()}/api/products/${productId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

async function restoreProduct(productId: string) {
  const res = await fetch(`${getApiUrl()}/api/products/${productId}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to restore product");
  return res.json();
}

async function toggleVisibility(productId: string, isActive: boolean) {
  const res = await fetch(
    `${getApiUrl()}/api/products/${productId}/visibility`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update visibility");
  }
  return res.json();
}

function EditablePriceCell({
  productId,
  field,
  value,
  onSaved,
}: {
  productId: string;
  field: "price" | "compareAtPrice";
  value: number | null | undefined;
  onSaved: (
    productId: string,
    field: "price" | "compareAtPrice",
    newValue: number | null,
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue =
    value && value > 0 ? `$${(value / 100).toFixed(2)}` : "—";

  const startEditing = () => {
    setDraft(value && value > 0 ? (value / 100).toFixed(2) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const save = async () => {
    const parsed = parseFloat(draft);
    const cents =
      !draft.trim() || isNaN(parsed)
        ? field === "price"
          ? null
          : 0
        : Math.round(parsed * 100);

    if (field === "price" && (cents === null || cents <= 0)) {
      setEditing(false);
      return;
    }

    const newValue =
      field === "compareAtPrice" && (!draft.trim() || cents === 0)
        ? null
        : cents;

    if (newValue === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateProductField(productId, { [field]: newValue });
      onSaved(productId, field, newValue);
    } catch {
      /* handled silently */
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-base-content/50">$</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          className="input input-bordered input-xs w-24"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          disabled={saving}
          autoFocus
        />
        {saving && <span className="loading loading-spinner loading-xs" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="text-left hover:underline cursor-pointer decoration-dotted underline-offset-2"
      onClick={startEditing}>
      {displayValue}
    </button>
  );
}

function CollectionsDropdown({
  productId,
  selectedIds,
  allCollections,
  onSaved,
}: {
  productId: string;
  selectedIds: string[];
  allCollections: Collection[];
  onSaved: (productId: string, collectionIds: string[]) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    } else {
      setPosition(null);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasChanges = (() => {
    const orig = new Set(selectedIds);
    if (orig.size !== selected.size) return true;
    for (const id of selected) if (!orig.has(id)) return true;
    return false;
  })();

  const save = async () => {
    setSaving(true);
    const ids = Array.from(selected);
    try {
      await updateProductField(productId, { collections: ids });
      await onSaved(productId, ids);
      setOpen(false);
    } catch {
      /* handled silently */
    } finally {
      setSaving(false);
    }
  };

  const displayNames = allCollections
    .filter((c) => selected.has(c._id))
    .map((c) => c.name);

  const dropdownContent = open &&
    position &&
    typeof document !== "undefined" && (
      <div
        ref={dropdownRef}
        className="fixed z-[9999] w-56 bg-base-100 border border-base-300 rounded-lg shadow-xl p-2 space-y-1 max-h-60 overflow-y-auto"
        style={{ top: position.top, left: position.left }}>
        {allCollections.length === 0 && (
          <div className="text-xs text-base-content/50 px-2 py-1">
            No collections available
          </div>
        )}
        {allCollections.map((c) => (
          <label
            key={c._id}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-base-200 cursor-pointer text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={selected.has(c._id)}
              onChange={() => toggle(c._id)}
            />
            {c.name}
          </label>
        ))}
        {hasChanges && (
          <button
            className="btn btn-primary btn-xs w-full mt-1"
            onClick={save}
            disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Save"
            )}
          </button>
        )}
      </div>
    );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost btn-sm sm:btn-xs text-left normal-case gap-1 max-w-[200px] min-h-10 sm:min-h-0"
        onClick={() => setOpen(!open)}>
        <span className="truncate">
          {displayNames.length === 0 ? "None" : displayNames.join(", ")}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export default function AdminProductsPage() {
  const products = useProductStore((s) => s.products);
  const total = useProductStore((s) => s.total);
  const page = useProductStore((s) => s.page);
  const productsLoading = useProductStore((s) => s.productsLoading);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchCategories = useProductStore((s) => s.fetchCategories);
  const fetchCollections = useProductStore((s) => s.fetchCollections);
  const categories = useProductStore((s) => s.categories);
  const collections = useProductStore((s) => s.collections);
  const updateProductInList = useProductStore((s) => s.updateProductInList);
  const removeProductFromList = useProductStore((s) => s.removeProductFromList);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewStatus, setViewStatus] = useState<"active" | "inactive">("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState<string | null>(
    null,
  );
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  const fetchWithSort = useCallback(
    (
      overrides: {
        page?: number;
        q?: string;
        sort?: string;
        order?: "asc" | "desc";
        status?: string;
        category?: string;
      } = {},
    ) => {
      return fetchProducts({
        page: overrides.page ?? 1,
        limit: pageSize,
        q: overrides.q,
        sort: overrides.sort ?? sortField,
        order: overrides.order ?? sortOrder,
        status: overrides.status ?? viewStatus,
        category: overrides.category ?? (filterCategory || undefined),
        hidden: "include",
      });
    },
    [fetchProducts, pageSize, sortField, sortOrder, viewStatus, filterCategory],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const q = debouncedSearchQuery.trim() || undefined;
    fetchWithSort({ page: 1, q });
  }, [debouncedSearchQuery, fetchWithSort]);

  useEffect(() => {
    fetchCategories();
    fetchCollections();
  }, [fetchCategories, fetchCollections]);

  const handleCategoryChange = async (
    productId: string,
    categoryId: string,
  ) => {
    const prev = products.find((p) => p._id === productId);
    setSavingCategory(productId);
    updateProductInList(productId, { category: categoryId });
    try {
      await updateProductField(productId, { category: categoryId });
    } catch {
      if (prev) updateProductInList(productId, { category: prev.category });
    } finally {
      setSavingCategory(null);
    }
  };

  const handlePriceSaved = useCallback(
    (
      productId: string,
      field: "price" | "compareAtPrice",
      newValue: number | null,
    ) => {
      updateProductInList(productId, { [field]: newValue } as Partial<Product>);
    },
    [updateProductInList],
  );

  const handleCollectionsSaved = useCallback(
    async (productId: string, collectionIds: string[]) => {
      updateProductInList(productId, { collections: collectionIds });
      await revalidateCollections();
    },
    [updateProductInList],
  );

  const SORTABLE_COLUMNS: { key: string; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "isActive", label: "Visible" },
    { key: "category", label: "Category" },
    { key: "collections", label: "Collections" },
    { key: "price", label: "Price" },
    { key: "compareAtPrice", label: "Compare At" },
    { key: "quantity", label: "Qty" },
  ];

  const handleSort = (field: string) => {
    const nextOrder =
      sortField === field
        ? sortOrder === "asc"
          ? ("desc" as const)
          : ("asc" as const)
        : "asc";
    if (sortField !== field) setSortField(field);
    setSortOrder(nextOrder);
    fetchWithSort({ page: 1, sort: field, order: nextOrder });
  };

  const SortableTh = ({
    columnKey,
    label,
  }: {
    columnKey: string;
    label: string;
  }) => (
    <th>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer select-none"
        onClick={() => handleSort(columnKey)}>
        {label}
        {sortField === columnKey ? (
          sortOrder === "asc" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fillRule="evenodd"
                d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 opacity-30"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </th>
  );

  const openDeleteModal = (product: { _id: string; name: string }) => {
    setConfirmDelete({ id: product._id, name: product.name });
    modalRef.current?.showModal();
  };

  const closeDeleteModal = () => {
    modalRef.current?.close();
    setConfirmDelete(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    try {
      await deleteProduct(confirmDelete.id);
      closeDeleteModal();
      removeProductFromList(confirmDelete.id);
    } catch {
      /* handled silently */
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (productId: string) => {
    setActionLoading(productId);
    try {
      await restoreProduct(productId);
      removeProductFromList(productId);
    } catch {
      /* handled silently */
    } finally {
      setActionLoading(null);
    }
  };

  const handleVisibilityToggle = async (
    productId: string,
    currentlyActive: boolean,
  ) => {
    setVisibilityLoading(productId);
    setVisibilityError(null);
    updateProductInList(productId, { isActive: !currentlyActive });
    try {
      await toggleVisibility(productId, !currentlyActive);
    } catch (err: unknown) {
      updateProductInList(productId, { isActive: currentlyActive });
      setVisibilityError(
        err instanceof Error ? err.message : "Failed to update visibility",
      );
    } finally {
      setVisibilityLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    const q = debouncedSearchQuery.trim() || undefined;
    fetchProducts({
      page: 1,
      limit: newSize,
      q,
      sort: sortField,
      order: sortOrder,
      status: viewStatus,
      category: filterCategory || undefined,
      hidden: "include",
    });
  };

  const PaginationControls = () => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm whitespace-nowrap">Rows per page:</span>
          <select
            className="select select-bordered select-sm min-h-11 w-auto max-w-20"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              className="btn btn-sm min-h-11 min-w-11"
              onClick={() =>
                fetchWithSort({
                  page: Math.max(1, page - 1),
                  q: debouncedSearchQuery.trim() || undefined,
                })
              }
              disabled={page === 1 || productsLoading}
              aria-label="Previous page">
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                return (
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
                );
              })
              .map((p, idx, arr) => {
                const prevPage = arr[idx - 1];
                const showEllipsis = prevPage && p - prevPage > 1;
                return (
                  <span key={p} className="contents">
                    {showEllipsis && (
                      <span className="px-2 py-2 text-base-content/50" aria-hidden>
                        …
                      </span>
                    )}
                    <button
                      className={`btn btn-sm min-h-11 min-w-11 ${page === p ? "btn-active" : ""}`}
                      onClick={() =>
                        fetchWithSort({
                          page: p,
                          q: debouncedSearchQuery.trim() || undefined,
                        })
                      }
                      disabled={productsLoading}
                      aria-label={`Page ${p}`}
                      aria-current={page === p ? "page" : undefined}>
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              className="btn btn-sm min-h-11 min-w-11"
              onClick={() =>
                fetchWithSort({
                  page: Math.min(totalPages, page + 1),
                  q: debouncedSearchQuery.trim() || undefined,
                })
              }
              disabled={page === totalPages || productsLoading}
              aria-label="Next page">
              »
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="mt-1 text-base-content/80">
                Manage your product catalog and inventory.
              </p>
            </div>
            <Link href="/admin/products/new" className="btn btn-primary">
              Add product
            </Link>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div role="tablist" className="tabs tabs-bordered mb-4">
            <button
              role="tab"
              className={`tab ${viewStatus === "active" ? "tab-active" : ""}`}
              onClick={() => setViewStatus("active")}>
              Active
            </button>
            <button
              role="tab"
              className={`tab ${viewStatus === "inactive" ? "tab-active" : ""}`}
              onClick={() => setViewStatus("inactive")}>
              Inactive
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <label className="input input-bordered flex items-center gap-2 flex-1 max-w-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-4 h-4 opacity-70">
                <path
                  fillRule="evenodd"
                  d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.755ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by product name..."
                className="grow"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <select
              className="select select-bordered w-full sm:w-48"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {filterDisplayCategories(categories).map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-base-content/70">
              Showing {products.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, total)} of {total} products
            </div>
          </div>
          <PaginationControls />
          {visibilityError && (
            <div className="alert alert-error text-sm mt-2">
              <span>{visibilityError}</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setVisibilityError(null)}>
                Dismiss
              </button>
            </div>
          )}
          <div className="overflow-x-auto mt-4 -mx-2 sm:mx-0 px-2 sm:px-0">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  {SORTABLE_COLUMNS.map((col) => (
                    <SortableTh
                      key={col.key}
                      columnKey={col.key}
                      label={col.label}
                    />
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {productsLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <span className="loading loading-spinner loading-md" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-base-content/70 py-8">
                      {debouncedSearchQuery.trim()
                        ? `No products match "${debouncedSearchQuery}".`
                        : viewStatus === "inactive"
                          ? "No inactive products."
                          : "No products yet."}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isActive = p.isActive !== false;
                    const zeroPriceHidden =
                      !isActive && (!p.price || p.price <= 0);
                    return (
                      <tr
                        key={p._id}
                        className={
                          viewStatus === "inactive"
                            ? "opacity-60"
                            : !isActive
                              ? "opacity-70"
                              : ""
                        }>
                        <td>{p.name}</td>
                        <td>
                          {viewStatus === "active" ? (
                            <div className="flex items-center gap-2 min-h-10">
                              <input
                                type="checkbox"
                                className={`toggle toggle-sm min-h-6 min-w-12 ${isActive ? "toggle-success" : ""}`}
                                checked={isActive}
                                disabled={visibilityLoading === p._id}
                                onChange={() =>
                                  handleVisibilityToggle(p._id, isActive)
                                }
                                aria-label={`Toggle visibility for ${p.name}`}
                              />
                              {!isActive && (
                                <span className="badge badge-warning badge-xs whitespace-nowrap">
                                  {zeroPriceHidden ? "No price" : "Hidden"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-base-content/50">
                              N/A
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            className="select select-bordered select-sm sm:select-xs w-full max-w-[160px] min-h-10 sm:min-h-0"
                            value={getCategoryId(p)}
                            disabled={
                              savingCategory === p._id ||
                              viewStatus === "inactive"
                            }
                            onChange={(e) =>
                              handleCategoryChange(p._id, e.target.value)
                            }>
                            {!getCategoryId(p) && <option value="">—</option>}
                            {filterDisplayCategories(categories).map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          {savingCategory === p._id && (
                            <span className="loading loading-spinner loading-xs ml-1" />
                          )}
                        </td>
                        <td>
                          <CollectionsDropdown
                            productId={p._id}
                            selectedIds={getCollectionIds(p)}
                            allCollections={collections}
                            onSaved={handleCollectionsSaved}
                          />
                        </td>
                        <td>
                          <EditablePriceCell
                            productId={p._id}
                            field="price"
                            value={p.price}
                            onSaved={handlePriceSaved}
                          />
                        </td>
                        <td>
                          <EditablePriceCell
                            productId={p._id}
                            field="compareAtPrice"
                            value={p.compareAtPrice}
                            onSaved={handlePriceSaved}
                          />
                        </td>
                        <td>{p.inventory?.quantity ?? 0}</td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2 min-h-11">
                            {viewStatus === "active" ? (
                              <>
                                <Link
                                  href={`/admin/products/${p._id}`}
                                  className="btn btn-ghost btn-sm sm:btn-xs min-h-10 min-w-16 sm:min-w-0">
                                  Edit
                                </Link>
                                <button
                                  className="btn btn-ghost btn-sm sm:btn-xs text-error min-h-10 min-w-16 sm:min-w-0"
                                  onClick={() => openDeleteModal(p)}>
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-success btn-sm sm:btn-xs min-h-10 min-w-20 sm:min-w-0"
                                onClick={() => handleRestore(p._id)}
                                disabled={actionLoading === p._id}>
                                {actionLoading === p._id ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  "Restore"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls />
        </div>
      </div>

      <dialog ref={modalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Product</h3>
          <p className="py-4">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{confirmDelete?.name}</span>? This
            will mark it as{" "}
            <span className="badge badge-warning badge-sm align-middle">
              Inactive
            </span>{" "}
            and remove it from the storefront. You can restore it later from the
            Inactive tab.
          </p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={closeDeleteModal}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={actionLoading === confirmDelete?.id}>
              {actionLoading === confirmDelete?.id ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Yes, delete"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeDeleteModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}
