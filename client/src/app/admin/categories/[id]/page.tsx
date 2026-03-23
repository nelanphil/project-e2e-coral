"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import type { Category } from "@/lib/types";

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

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/api/categories/id/${id}`)
      .then((r) => r.json())
      .then((c) => {
        if (c._id) {
          setCategory(c);
          setForm({ name: c.name, slug: c.slug });
        }
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await api(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/admin/categories");
  }

  if (!category) return <p>Loading…</p>;

  return (
    <div className="container max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title text-2xl">Edit category</h1>
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
                {loading ? "Saving…" : "Save"}
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
