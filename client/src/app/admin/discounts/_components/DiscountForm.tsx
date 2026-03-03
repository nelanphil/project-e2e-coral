"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

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

/* ── Form state ───────────────────────────────────────────────────────────── */

export type FormState = {
  code: string;
  description: string;
  discountType: "product" | "shipping";
  valueType: "percentage" | "fixed";
  valueCents: string;
  valuePercent: string;
  maxDiscountCents: string;
  minOrderCents: string;
  maxUsesTotal: string;
  maxUsesPerUser: string;
  startDate: string;
  expiresAt: string;
  isActive: boolean;
  firstOrderOnly: boolean;
  applicableProducts: string[];
};

export const emptyForm: FormState = {
  code: "",
  description: "",
  discountType: "product",
  valueType: "percentage",
  valueCents: "",
  valuePercent: "",
  maxDiscountCents: "",
  minOrderCents: "",
  maxUsesTotal: "",
  maxUsesPerUser: "",
  startDate: new Date().toISOString().slice(0, 10),
  expiresAt: "",
  isActive: true,
  firstOrderOnly: false,
  applicableProducts: [],
};

type FormTab = "basic" | "restrictions" | "targeting";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Component ────────────────────────────────────────────────────────────── */

interface DiscountFormProps {
  /** If set, we're editing an existing discount */
  editingId?: string;
  /** Pre-filled form values (used for edit mode) */
  initialValues?: FormState;
  /** Title shown at top */
  title: string;
  /** Subtitle shown below title */
  subtitle: string;
}

export default function DiscountForm({
  editingId,
  initialValues,
  title,
  subtitle,
}: DiscountFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    initialValues ?? { ...emptyForm },
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>("basic");

  // Products for targeting
  const [allProducts, setAllProducts] = useState<
    { _id: string; name: string }[]
  >([]);

  useEffect(() => {
    api("/api/products?limit=500")
      .then((r) => r.json())
      .then((d) =>
        setAllProducts(
          (d.products ?? []).map((p: { _id: string; name: string }) => ({
            _id: p._id,
            name: p.name,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  /* ── Save handler ───────────────────────────────────────────────────────── */

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const body = {
      code: form.code.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      valueType: form.valueType,
      valueCents:
        form.valueType === "fixed"
          ? Math.round(parseFloat(form.valueCents || "0") * 100)
          : 0,
      valuePercent:
        form.valueType === "percentage"
          ? parseFloat(form.valuePercent || "0")
          : 0,
      maxDiscountCents: form.maxDiscountCents
        ? Math.round(parseFloat(form.maxDiscountCents) * 100)
        : 0,
      minOrderCents: form.minOrderCents
        ? Math.round(parseFloat(form.minOrderCents) * 100)
        : 0,
      maxUsesTotal: form.maxUsesTotal ? parseInt(form.maxUsesTotal, 10) : 0,
      maxUsesPerUser: form.maxUsesPerUser
        ? parseInt(form.maxUsesPerUser, 10)
        : 0,
      startDate: form.startDate || null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
      firstOrderOnly: form.firstOrderOnly,
      applicableProducts:
        form.discountType === "product"
          ? form.applicableProducts.filter((id) => id !== "_placeholder_")
          : [],
    };

    try {
      const url = editingId
        ? `/api/admin/discounts/${editingId}`
        : "/api/admin/discounts";
      const method = editingId ? "PUT" : "POST";
      const res = await api(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      // Navigate back to the discounts list
      router.push("/admin/discounts");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
      setSaving(false);
    }
  }

  function previewValue() {
    if (form.valueType === "percentage") {
      const pct = parseFloat(form.valuePercent || "0");
      return `${pct}% off`;
    }
    const amt = parseFloat(form.valueCents || "0");
    return `$${amt.toFixed(2)} off`;
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ← Back button */}
      <button
        type="button"
        className="btn btn-ghost btn-sm gap-1 -ml-2"
        onClick={() => router.push("/admin/discounts")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="size-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
          />
        </svg>
        Back to Discounts
      </button>

      {/* Alert */}
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

      {/* Main card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {/* Title */}
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-base-content/60 mb-4">{subtitle}</p>

          {/* ── Form tabs ─────────────────────────────────────────────────── */}
          <div className="flex rounded-lg bg-base-200 p-1 mb-6">
            {(["basic", "restrictions", "targeting"] as FormTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-base-100 shadow-sm"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                  onClick={() => setActiveTab(tab)}>
                  {tab === "basic"
                    ? "Basic Info"
                    : tab === "restrictions"
                      ? "Restrictions"
                      : "Targeting"}
                </button>
              ),
            )}
          </div>

          {/* ── Tab: Basic Info ────────────────────────────────────────────── */}
          {activeTab === "basic" && (
            <div className="space-y-5">
              {/* Code */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Discount Code *
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1 uppercase"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    placeholder="E.G., SAVE20"
                  />
                  <button
                    type="button"
                    className="btn bg-pink-500 hover:bg-pink-600 text-white border-0"
                    onClick={() => setForm({ ...form, code: generateCode() })}>
                    Generate
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Description (internal)
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="e.g., Summer sale campaign"
                />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Discount Type *
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={
                      form.discountType === "shipping"
                        ? "shipping"
                        : form.valueType
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "shipping") {
                        setForm({
                          ...form,
                          discountType: "shipping",
                          valueType: "percentage",
                          valuePercent: "100",
                        });
                      } else {
                        setForm({
                          ...form,
                          discountType: "product",
                          valueType: v as "percentage" | "fixed",
                        });
                      }
                    }}>
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount Off</option>
                    <option value="shipping">Free Shipping</option>
                  </select>
                </div>
                <div className="form-control">
                  {form.discountType === "shipping" ? (
                    <>
                      <label className="label">
                        <span className="label-text font-medium">
                          Shipping Discount
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="input input-bordered flex-1"
                          value={form.valuePercent}
                          onChange={(e) =>
                            setForm({ ...form, valuePercent: e.target.value })
                          }
                          placeholder="100"
                        />
                        <span className="text-base-content/60 font-medium">
                          %
                        </span>
                      </div>
                    </>
                  ) : form.valueType === "percentage" ? (
                    <>
                      <label className="label">
                        <span className="label-text font-medium">
                          Discount Percentage *
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="input input-bordered flex-1"
                          value={form.valuePercent}
                          onChange={(e) =>
                            setForm({ ...form, valuePercent: e.target.value })
                          }
                          placeholder="20"
                        />
                        <span className="text-base-content/60 font-medium">
                          %
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="label">
                        <span className="label-text font-medium">
                          Discount Amount *
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-base-content/60 font-medium">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input input-bordered flex-1"
                          value={form.valueCents}
                          onChange={(e) =>
                            setForm({ ...form, valueCents: e.target.value })
                          }
                          placeholder="5.00"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Valid From *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Valid Until</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Leave empty for no expiration
                    </span>
                  </label>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-success"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                <span className="label-text">Active (code can be used)</span>
              </label>
            </div>
          )}

          {/* ── Tab: Restrictions ──────────────────────────────────────────── */}
          {activeTab === "restrictions" && (
            <div className="space-y-6">
              {/* Min order & Max discount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Minimum Order Amount
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input input-bordered flex-1"
                      value={form.minOrderCents}
                      onChange={(e) =>
                        setForm({ ...form, minOrderCents: e.target.value })
                      }
                      placeholder="No minimum"
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Maximum Discount Amount
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input input-bordered flex-1"
                      value={form.maxDiscountCents}
                      onChange={(e) =>
                        setForm({ ...form, maxDiscountCents: e.target.value })
                      }
                      placeholder="No maximum"
                    />
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Cap the discount even if percentage would give more
                    </span>
                  </label>
                </div>
              </div>

              {/* Usage Limits divider */}
              <div className="divider text-base-content/40 text-sm">
                Usage Limits
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Total Uses Limit
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input input-bordered w-full"
                    value={form.maxUsesTotal}
                    onChange={(e) =>
                      setForm({ ...form, maxUsesTotal: e.target.value })
                    }
                    placeholder="Unlimited"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Maximum times this code can be used
                    </span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Uses Per Customer
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input input-bordered w-full"
                    value={form.maxUsesPerUser}
                    onChange={(e) =>
                      setForm({ ...form, maxUsesPerUser: e.target.value })
                    }
                    placeholder="Unlimited"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Maximum times per customer
                    </span>
                  </label>
                </div>
              </div>

              {/* First order only */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) =>
                    setForm({ ...form, firstOrderOnly: e.target.checked })
                  }
                />
                <div>
                  <p className="font-medium text-sm">First order only</p>
                  <p className="text-xs text-base-content/50">
                    Only valid for customers who haven&apos;t placed an order
                    before
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ── Tab: Targeting ─────────────────────────────────────────────── */}
          {activeTab === "targeting" && (
            <div className="space-y-6">
              {form.discountType === "product" ? (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Applies To</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={
                      form.applicableProducts.length === 0 ? "all" : "specific"
                    }
                    onChange={(e) => {
                      if (e.target.value === "all") {
                        setForm({ ...form, applicableProducts: [] });
                      } else {
                        setForm({
                          ...form,
                          applicableProducts: ["_placeholder_"],
                        });
                      }
                    }}>
                    <option value="all">All Products</option>
                    <option value="specific">Specific Products</option>
                  </select>

                  {form.applicableProducts.length > 0 && (
                    <div className="mt-3 border border-base-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                      {allProducts.map((p) => (
                        <label
                          key={p._id}
                          className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={form.applicableProducts.includes(p._id)}
                            onChange={(e) => {
                              const cleaned = form.applicableProducts.filter(
                                (id) => id !== "_placeholder_",
                              );
                              if (e.target.checked) {
                                setForm({
                                  ...form,
                                  applicableProducts: [...cleaned, p._id],
                                });
                              } else {
                                const remaining = cleaned.filter(
                                  (id) => id !== p._id,
                                );
                                setForm({
                                  ...form,
                                  applicableProducts:
                                    remaining.length > 0 ? remaining : [],
                                });
                              }
                            }}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  )}

                  {form.applicableProducts.length > 0 &&
                    !form.applicableProducts.includes("_placeholder_") && (
                      <label className="label">
                        <span className="label-text-alt text-base-content/50">
                          {form.applicableProducts.length} product(s) selected
                        </span>
                        <button
                          type="button"
                          className="label-text-alt link"
                          onClick={() =>
                            setForm({ ...form, applicableProducts: [] })
                          }>
                          Clear all
                        </button>
                      </label>
                    )}
                </div>
              ) : (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Applies To</span>
                  </label>
                  <p className="text-sm text-base-content/60">
                    This shipping discount applies to all shipping methods.
                  </p>
                </div>
              )}

              <div className="divider" />

              {/* Discount Preview */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Discount Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Code:</span>
                    <span className="font-mono font-bold">
                      {form.code || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Type:</span>
                    <span>
                      {form.discountType === "shipping"
                        ? "Free Shipping"
                        : previewValue()}
                    </span>
                  </div>
                  {form.minOrderCents && parseFloat(form.minOrderCents) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Min order:</span>
                      <span>${parseFloat(form.minOrderCents).toFixed(2)}</span>
                    </div>
                  )}
                  {form.maxDiscountCents &&
                    parseFloat(form.maxDiscountCents) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-base-content/60">
                          Max discount:
                        </span>
                        <span>
                          ${parseFloat(form.maxDiscountCents).toFixed(2)}
                        </span>
                      </div>
                    )}
                  {form.startDate && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Valid from:</span>
                      <span>{fmtDate(form.startDate)}</span>
                    </div>
                  )}
                  {form.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Expires:</span>
                      <span>{fmtDate(form.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/admin/discounts")}>
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-base-content text-base-100 hover:bg-base-content/90 border-0"
              onClick={handleSave}
              disabled={saving || !form.code.trim()}>
              {saving ? "Saving…" : editingId ? "Update Code" : "Create Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
