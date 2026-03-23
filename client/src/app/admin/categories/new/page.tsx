"use client";
import { getBaseUrl } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";

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

export default function NewCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", slug: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.trim(),
        slug: form.slug || slugify(form.name),
      }),
    });

    if (res.ok) {
      router.push("/admin/categories");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create category");
    }

    setLoading(false);
  }

  return (
    <div className="container max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title text-2xl">Add category</h1>

          {error && (
            <div className="alert alert-error mt-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-md">
            <div>
              <label className="label">Name</label>
              <input
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: slugify(e.target.value),
                  }))
                }
                placeholder="e.g. Electronics"
                required
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                className="input input-bordered w-full read-only bg-base-200"
                value={form.slug}
                readOnly
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}>
                {loading ? "Creating…" : "Create"}
              </button>
              <Link href="/admin/categories" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
