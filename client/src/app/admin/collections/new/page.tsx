"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { revalidateCollections } from "@/app/actions/revalidate";
import { getAuthToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";

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

export default function NewCollectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    carouselDescription: "",
    showInCarousel: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name]);

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await api("/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        carouselDescription: form.carouselDescription,
        showInCarousel: form.showInCarousel,
        tags: tags,
      }),
    });
    setLoading(false);
    if (res.ok) {
      await revalidateCollections();
      router.push("/admin/collections");
    } else {
      const error = await res.json();
      alert(error.error || "Failed to create collection");
    }
  }

  return (
    <div className="container max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title text-2xl">New collection</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
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
                placeholder="Auto-generated from name"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div>
              <label className="label">Carousel description</label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={form.carouselDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carouselDescription: e.target.value }))
                }
                placeholder="Short text shown on the home page collections carousel"
                rows={2}
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.showInCarousel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, showInCarousel: e.target.checked }))
                  }
                />
                <span className="label-text">Show on home page carousel</span>
              </label>
            </div>
            <div>
              <label className="label">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="Add a tag and press Enter or comma"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="badge badge-primary gap-2">
                      {tag}
                      <button
                        type="button"
                        className="hover:text-error"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Saving…" : "Save"}
              </button>
              <Link href="/admin/collections" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
