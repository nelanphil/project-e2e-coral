"use client";
import { getBaseUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";

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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(filterDisplayCategories(d.categories ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setDeletingId(id);
    const res = await api(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c._id !== id));
    }
    setDeletingId(null);
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Categories</h1>
              <p className="mt-1 text-base-content/80">
                Organize your products into categories for better navigation.
              </p>
            </div>
            <Link href="/admin/categories/new" className="btn btn-primary">
              Add category
            </Link>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.slug}</td>
                    <td className="flex gap-1">
                      <Link
                        href={`/admin/categories/${c._id}`}
                        className="btn btn-ghost btn-xs"
                      >
                        Edit
                      </Link>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        disabled={deletingId === c._id}
                        onClick={() => handleDelete(c._id)}
                      >
                        {deletingId === c._id ? "…" : "Delete"}
                      </button>
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
