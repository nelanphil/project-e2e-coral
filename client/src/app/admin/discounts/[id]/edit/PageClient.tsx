"use client";
import { getBaseUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import type { Discount } from "@/lib/types";
import DiscountForm, { type FormState } from "../../_components/DiscountForm";

const api = (path: string, options?: RequestInit) => {
  const base = getBaseUrl();
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

function discountToForm(d: Discount): FormState {
  return {
    code: d.code,
    description: d.description ?? "",
    discountType: d.discountType,
    valueType: d.valueType,
    valueCents: d.valueCents ? (d.valueCents / 100).toFixed(2) : "",
    valuePercent: d.valuePercent ? String(d.valuePercent) : "",
    maxDiscountCents: d.maxDiscountCents
      ? (d.maxDiscountCents / 100).toFixed(2)
      : "",
    minOrderCents: d.minOrderCents ? (d.minOrderCents / 100).toFixed(2) : "",
    maxUsesTotal: d.maxUsesTotal ? String(d.maxUsesTotal) : "",
    maxUsesPerUser: d.maxUsesPerUser ? String(d.maxUsesPerUser) : "",
    startDate: d.startDate ? d.startDate.slice(0, 10) : "",
    expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : "",
    isActive: d.isActive,
    firstOrderOnly: d.firstOrderOnly ?? false,
    applicableProducts: d.applicableProducts?.map((p) => p._id) ?? [],
  };
}

export default function EditDiscountPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [discount, setDiscount] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/admin/discounts/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setDiscount(data.discount);
      })
      .catch(() => setError("Discount not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || !discount) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error">
          <span>{error || "Failed to load discount"}</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/admin/discounts")}>
          ΓåÉ Back to Discounts
        </button>
      </div>
    );
  }

  return (
    <DiscountForm
      editingId={id}
      initialValues={discountToForm(discount)}
      title="Edit Discount Code"
      subtitle="Update this discount code for your customers"
    />
  );
}
