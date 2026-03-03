"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import type { Discount } from "@/lib/types";

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

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusInfo(d: Discount): { label: string; cls: string } {
  if (!d.isActive) return { label: "Inactive", cls: "badge-ghost" };
  const now = new Date();
  if (d.expiresAt && new Date(d.expiresAt) < now)
    return { label: "Expired", cls: "bg-error text-error-content" };
  if (d.startDate && new Date(d.startDate) > now)
    return { label: "Scheduled", cls: "badge-info" };
  return { label: "Active", cls: "bg-success text-success-content" };
}

function formatValue(d: Discount) {
  if (
    d.discountType === "shipping" &&
    d.valueType === "percentage" &&
    d.valuePercent === 100
  )
    return "Free Shipping";
  if (d.discountType === "shipping" && d.valueType === "fixed")
    return `$${(d.valueCents / 100).toFixed(2)} off shipping`;
  if (d.discountType === "shipping") return `${d.valuePercent}% off shipping`;
  if (d.valueType === "percentage") return `${d.valuePercent}% off`;
  return `$${(d.valueCents / 100).toFixed(2)} off`;
}

function typeBadge(d: Discount) {
  if (d.discountType === "shipping") {
    return (
      <span className="badge badge-sm bg-emerald-600 text-white border-0">
        Free Shipping
      </span>
    );
  }
  if (d.valueType === "percentage") {
    return (
      <span className="badge badge-sm bg-base-content/10 border-0">
        Percentage
      </span>
    );
  }
  return (
    <span className="badge badge-sm bg-base-content/10 border-0">Fixed</span>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function AdminDiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"product" | "shipping">("product");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "fixed">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "expired"
  >("all");

  // Usage log modal
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageLog, setUsageLog] = useState<Discount["usageLog"]>([]);
  const [usageCode, setUsageCode] = useState("");
  const [usageLoading, setUsageLoading] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(
        `/api/admin/discounts?page=${page}&limit=100&includeInactive=true`,
      );
      const data = await res.json();
      setDiscounts(data.discounts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMessage({ type: "error", text: "Failed to load discounts" });
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  /* ── Client-side filtering ──────────────────────────────────────────────── */

  const filtered = discounts.filter((d) => {
    if (d.discountType !== activeTab) return false;
    if (
      search &&
      !d.code.toLowerCase().includes(search.toLowerCase()) &&
      !(d.description ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (typeFilter !== "all" && d.valueType !== typeFilter) return false;
    if (statusFilter !== "all") {
      const s = statusInfo(d);
      if (statusFilter === "active" && s.label !== "Active") return false;
      if (statusFilter === "inactive" && s.label !== "Inactive") return false;
      if (statusFilter === "expired" && s.label !== "Expired") return false;
    }
    return true;
  });

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await api(`/api/admin/discounts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchDiscounts();
    } catch {
      setMessage({ type: "error", text: "Failed to toggle status" });
    }
  }

  async function openUsageLog(discount: Discount) {
    setUsageCode(discount.code);
    setUsageLoading(true);
    setUsageModalOpen(true);
    try {
      const res = await api(`/api/admin/discounts/${discount._id}/usage`);
      const data = await res.json();
      setUsageLog(data.usageLog ?? []);
    } catch {
      setUsageLog([]);
    }
    setUsageLoading(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / 100));

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Top tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-0">
        <button
          type="button"
          className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "product"
              ? "bg-primary text-primary-content"
              : "bg-base-100 text-base-content hover:bg-base-200"
          }`}
          onClick={() => {
            setActiveTab("product");
            setPage(1);
          }}>
          Product Discounts
        </button>
        <button
          type="button"
          className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "shipping"
              ? "bg-primary text-primary-content"
              : "bg-base-100 text-base-content hover:bg-base-200"
          }`}
          onClick={() => {
            setActiveTab("shipping");
            setPage(1);
          }}>
          Shipping Discounts
        </button>
      </div>

      {/* ── Alert ─────────────────────────────────────────────────────────── */}
      {message && (
        <div
          className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
          <span>{message.text}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold">Discount Codes</h2>
              <p className="text-sm text-base-content/60">
                {filtered.length} codes total
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search codes..."
                className="input input-bordered input-sm w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select select-bordered select-sm"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value as "all" | "percentage" | "fixed",
                  )
                }>
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
              <select
                className="select select-bordered select-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "inactive" | "expired",
                  )
                }>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  router.push(`/admin/discounts/new?type=${activeTab}`)
                }>
                + Add Code
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-base-content/60 text-center py-8">
              No {activeTab} discount codes found.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="text-base-content/60">
                      <th>Code</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Usage</th>
                      <th>Valid Period</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const s = statusInfo(d);
                      return (
                        <tr key={d._id} className="hover">
                          <td>
                            <div>
                              <span className="font-mono font-bold">
                                {d.code}
                              </span>
                              {d.description && (
                                <p className="text-xs text-base-content/50 mt-0.5">
                                  {d.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td>{typeBadge(d)}</td>
                          <td className="font-medium">{formatValue(d)}</td>
                          <td>
                            <button
                              type="button"
                              className="link link-hover text-sm"
                              onClick={() => openUsageLog(d)}>
                              {d.usedCount}
                              {d.maxUsesTotal > 0 ? ` / ${d.maxUsesTotal}` : ""}
                            </button>
                            {d.maxUsesPerUser > 0 && (
                              <p className="text-xs text-base-content/50">
                                {d.maxUsesPerUser}/user max
                              </p>
                            )}
                          </td>
                          <td className="text-sm">
                            {fmtDate(d.startDate)}
                            {d.expiresAt && (
                              <>
                                <br />
                                <span className="text-base-content/50">
                                  to {fmtDate(d.expiresAt)}
                                </span>
                              </>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-sm ${s.cls}`}>
                              {s.label}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className={`btn btn-ghost btn-sm btn-circle ${d.isActive ? "text-success" : "text-base-content/40"}`}
                                title={d.isActive ? "Deactivate" : "Activate"}
                                onClick={() =>
                                  handleToggleActive(d._id, d.isActive)
                                }>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="size-5">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5.636 5.636a9 9 0 1 1 0 12.728M12 3v9"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-circle"
                                title="Edit"
                                onClick={() =>
                                  router.push(`/admin/discounts/${d._id}/edit`)
                                }>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="size-5">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    className="btn btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}>
                    Prev
                  </button>
                  <span className="flex items-center text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── Usage Log Modal ────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {usageModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Usage Log — {usageCode}</h3>
            {usageLoading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner" />
              </div>
            ) : usageLog.length === 0 ? (
              <p className="text-base-content/60 text-center py-4">
                No usage yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Order</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLog.map((entry, i) => (
                      <tr key={i}>
                        <td className="text-sm">
                          {entry.userId && typeof entry.userId === "object"
                            ? entry.userId.email
                            : entry.cookieId
                              ? `Guest (${entry.cookieId.slice(0, 8)}…)`
                              : "Unknown"}
                        </td>
                        <td className="text-sm font-mono">
                          {typeof entry.orderId === "object" &&
                          entry.orderId?._id
                            ? `#${entry.orderId._id.slice(-6).toUpperCase()}`
                            : typeof entry.orderId === "string"
                              ? `#${entry.orderId.slice(-6).toUpperCase()}`
                              : "—"}
                        </td>
                        <td className="text-sm">
                          {new Date(entry.usedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => setUsageModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setUsageModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
