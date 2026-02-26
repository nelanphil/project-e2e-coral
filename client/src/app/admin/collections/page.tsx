"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { revalidateCollections } from "@/app/actions/revalidate";
import { getAuthToken } from "@/lib/auth";
import type { Collection } from "@/lib/types";

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

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/collections")
      .then((r) => r.json())
      .then((d) => {
        setCollections(d.collections ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this collection? This will remove it from all products.",
      )
    ) {
      return;
    }
    const res = await api(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) {
      await revalidateCollections();
      setCollections(collections.filter((c) => c._id !== id));
    } else {
      alert("Failed to delete collection");
    }
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
              <h1 className="text-2xl font-bold">Collections</h1>
              <p className="mt-1 text-base-content/80">
                Manage product collections and organize your catalog.
              </p>
            </div>
            <Link href="/admin/collections/new" className="btn btn-primary">
              Add collection
            </Link>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60 mb-4">No collections yet.</p>
              <Link
                href="/admin/collections/new"
                className="btn btn-primary btn-sm"
              >
                Create your first collection
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Tags</th>
                    <th>Products</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {collections.map((c) => (
                    <tr key={c._id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="text-base-content/60">{c.slug}</td>
                      <td>
                        {c.tags && c.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="badge badge-ghost badge-sm"
                              >
                                {tag}
                              </span>
                            ))}
                            {c.tags.length > 3 && (
                              <span className="badge badge-ghost badge-sm">
                                +{c.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-base-content/40 text-sm">
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-outline">
                          {c.products?.length ?? 0}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/collections/${c._id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(c._id)}
                            className="btn btn-ghost btn-xs text-error"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
