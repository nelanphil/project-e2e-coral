"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { useProductStore } from "@/stores/product-store";
import {
  revalidateCollections,
  revalidateProducts,
} from "@/app/actions/revalidate";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import type { Category } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";
import type { Collection } from "@/lib/types";

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

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    price: "",
    compareAtPrice: "",
    cost: "",
    category: "",
    quantity: "0",
    images: [] as string[],
    collectionIds: [] as string[],
    attributes: {} as Record<string, string>,
    whyChoose: "",
    keyFeatures: "",
    colorVariation: "",
    growthHabit: "",
    optimalCare: "",
    idealCompatibility: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "details"
    | "seo"
    | "pricing"
    | "inventory"
    | "images"
    | "collections"
    | "attributes"
  >("details");
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  useEffect(() => {
    Promise.all([
      api("/api/categories")
        .then((r) => r.json())
        .then((d) => setCategories(d.categories ?? [])),
      api("/api/collections")
        .then((r) => r.json())
        .then((d) => setCollections(d.collections ?? [])),
    ]);
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setActiveTab("details");
      setError("Product name is required.");
      return;
    }
    if (!form.category) {
      setActiveTab("details");
      setError("Please select a category.");
      return;
    }
    if (
      !form.price ||
      isNaN(parseFloat(form.price)) ||
      parseFloat(form.price) <= 0
    ) {
      setActiveTab("pricing");
      setError("A valid price is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || slugify(form.name),
          sku: form.sku || null,
          description: form.description,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          price: Math.round(parseFloat(form.price) * 100),
          compareAtPrice: form.compareAtPrice
            ? Math.round(parseFloat(form.compareAtPrice) * 100)
            : null,
          cost: form.cost ? Math.round(parseFloat(form.cost) * 100) : 0,
          category: form.category,
          quantity: parseInt(form.quantity, 10) || 0,
          images: form.images,
          collections: form.collectionIds,
          attributes: form.attributes,
          whyChoose: form.whyChoose || null,
          keyFeatures: form.keyFeatures || null,
          colorVariation: form.colorVariation || null,
          growthHabit: form.growthHabit || null,
          optimalCare: form.optimalCare || null,
          idealCompatibility: form.idealCompatibility || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create product");
      }
      await Promise.all([
        useProductStore.getState().invalidate(),
        revalidateProducts(),
        revalidateCollections(),
      ]);
      router.push("/admin/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  function toggleCollection(collectionId: string) {
    setForm((f) => ({
      ...f,
      collectionIds: f.collectionIds.includes(collectionId)
        ? f.collectionIds.filter((id) => id !== collectionId)
        : [...f.collectionIds, collectionId],
    }));
  }

  function addAttribute() {
    if (newAttributeKey.trim() && newAttributeValue.trim()) {
      setForm((f) => ({
        ...f,
        attributes: {
          ...f.attributes,
          [newAttributeKey.trim()]: newAttributeValue.trim(),
        },
      }));
      setNewAttributeKey("");
      setNewAttributeValue("");
    }
  }

  function removeAttribute(key: string) {
    setForm((f) => {
      const newAttrs = { ...f.attributes };
      delete newAttrs[key];
      return { ...f, attributes: newAttrs };
    });
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">New Product</h1>
              <p className="mt-1 text-base-content/80">
                Create a new product for your store
              </p>
            </div>
            <Link href="/admin/products" className="btn btn-ghost btn-sm">
              Back to Products
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="card bg-error/10 border border-error/20 shadow">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <span className="text-error">⚠️</span>
              <p className="text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="tabs tabs-boxed mb-4">
              <button
                type="button"
                className={`tab ${activeTab === "details" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("details")}>
                Details
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "images" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("images")}>
                Images
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "pricing" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("pricing")}>
                Pricing
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("inventory")}>
                Inventory
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "collections" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("collections")}>
                Collections
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "attributes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("attributes")}>
                Attributes
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "seo" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("seo")}>
                SEO
              </button>
            </div>

            <div className={activeTab !== "details" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Name</span>
                  <span className="label-text-alt text-error">*</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Slug</span>
                </label>
                <input
                  className="input input-bordered w-full read-only bg-base-200"
                  value={form.slug}
                  readOnly
                  placeholder="Auto-generated from name"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">SKU</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  placeholder="Product SKU (optional)"
                />
                <label className="label">
                  <span className="label-text-alt">
                    Stock Keeping Unit identifier
                  </span>
                </label>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, description: html }))
                  }
                  minHeight="10rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Why Choose</span>
                </label>
                <RichTextEditor
                  value={form.whyChoose}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, whyChoose: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Key Features</span>
                </label>
                <RichTextEditor
                  value={form.keyFeatures}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, keyFeatures: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Color Variation</span>
                </label>
                <RichTextEditor
                  value={form.colorVariation}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, colorVariation: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Growth Habit</span>
                </label>
                <RichTextEditor
                  value={form.growthHabit}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, growthHabit: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Optimal Care</span>
                </label>
                <RichTextEditor
                  value={form.optimalCare}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, optimalCare: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">
                    Ideal Compatibility with Other Corals
                  </span>
                </label>
                <RichTextEditor
                  value={form.idealCompatibility}
                  onChange={(html) =>
                    setForm((f) => ({ ...f, idealCompatibility: html }))
                  }
                  placeholder="Optional"
                  minHeight="6rem"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Category</span>
                  <span className="label-text-alt text-error">*</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }>
                  <option value="">Select a category</option>
                  {filterDisplayCategories(categories).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={activeTab !== "images" ? "hidden" : ""}>
              <ProductImageManager
                images={form.images}
                onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))}
              />
            </div>

            <div className={activeTab !== "pricing" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Price (USD)</span>
                  <span className="label-text-alt text-error">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Compare-at Price (USD)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  placeholder="Original price shown as strikethrough"
                  value={form.compareAtPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, compareAtPrice: e.target.value }))
                  }
                />
                <label className="label">
                  <span className="label-text-alt">
                    Optional: Shows original price when on sale
                  </span>
                </label>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Cost (USD)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={form.cost}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cost: e.target.value }))
                  }
                />
                <label className="label">
                  <span className="label-text-alt">
                    Internal cost for profit calculation
                  </span>
                </label>
              </div>
            </div>

            <div className={activeTab !== "inventory" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Initial Quantity</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
            </div>

            <div
              className={activeTab !== "collections" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Collections</span>
                </label>
                <p className="text-sm text-base-content/70 mb-4">
                  Assign this product to one or more collections.
                </p>
                {collections.length === 0 ? (
                  <p className="text-sm text-base-content/60 italic mb-4">
                    No collections available.{" "}
                    <Link
                      href="/admin/collections/new"
                      className="link link-primary">
                      Create one
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <label
                        key={collection._id}
                        className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={form.collectionIds.includes(collection._id)}
                          onChange={() => toggleCollection(collection._id)}
                        />
                        <span>{collection.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={activeTab !== "attributes" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Custom Attributes</span>
                </label>
                <p className="text-sm text-base-content/70 mb-4">
                  Add custom key-value pairs for additional product information.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="Attribute key (e.g., Color, Size)"
                    value={newAttributeKey}
                    onChange={(e) => setNewAttributeKey(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="Attribute value"
                    value={newAttributeValue}
                    onChange={(e) => setNewAttributeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAttribute();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addAttribute}>
                    Add
                  </button>
                </div>
                {Object.keys(form.attributes).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(form.attributes).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                        <span className="font-medium flex-1">{key}:</span>
                        <span className="flex-1">{value}</span>
                        <button
                          type="button"
                          className="btn btn-error btn-xs"
                          onClick={() => removeAttribute(key)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(form.attributes).length === 0 && (
                  <p className="text-sm text-base-content/60 italic">
                    No attributes added yet.
                  </p>
                )}
              </div>
            </div>

            <div className={activeTab !== "seo" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">
                  <span className="label-text">Meta Title</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={form.metaTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, metaTitle: e.target.value }))
                  }
                  placeholder="Defaults to product name"
                />
                <label className="label">
                  <span className="label-text-alt">
                    Leave empty to use product name
                  </span>
                </label>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Meta Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={form.metaDescription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, metaDescription: e.target.value }))
                  }
                  placeholder="Defaults to product description"
                  rows={3}
                />
                <label className="label">
                  <span className="label-text-alt">
                    Leave empty to use product description
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Creating…
                  </>
                ) : (
                  "Create Product"
                )}
              </button>
              <Link href="/admin/products" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
