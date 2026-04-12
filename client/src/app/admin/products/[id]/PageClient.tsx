"use client";
import { getBaseUrl } from "@/lib/api";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { slugify } from "@/lib/slugify";
import { useProductStore } from "@/stores/product-store";
import { revalidateProducts } from "@/app/actions/revalidate";
import type { Product } from "@/lib/types";
import type { Category } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";
import type { Collection } from "@/lib/types";

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

function EditProductContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const returnToParam = searchParams.get("returnTo");
  const backHref =
    returnToParam && returnToParam.startsWith("/")
      ? returnToParam
      : "/admin/products";
  const { user: adminUser } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
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
    inventoryReason: "manual" as "manual" | "restock" | "adjustment",
    inventoryNotes: "",
    priceReason: "correction" as
      | "promotion"
      | "cost_change"
      | "market_adjustment"
      | "correction"
      | "other",
    priceNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
    const tab = searchParams.get("tab");
    if (tab === "inventory") {
      setActiveTab("inventory");
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    setError(null);
    api(`/api/products/id/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch product");
        return r.json();
      })
      .then((p) => {
        if (p._id) {
          setProduct(p);
          const catId =
            typeof p.category === "object"
              ? (p.category as Category)._id
              : p.category;
          const collectionIds = Array.isArray(p.collections)
            ? p.collections.map((c: Collection | string) =>
                typeof c === "object" ? c._id : c,
              )
            : [];
          setForm({
            name: p.name,
            slug: p.slug,
            sku: p.sku ?? "",
            description: p.description ?? "",
            metaTitle: p.metaTitle ?? "",
            metaDescription: p.metaDescription ?? "",
            price: (p.price / 100).toFixed(2),
            compareAtPrice: p.compareAtPrice
              ? (p.compareAtPrice / 100).toFixed(2)
              : "",
            cost: ((p.cost ?? 0) / 100).toFixed(2),
            category: catId ?? "",
            quantity: String(p.inventory?.quantity ?? 0),
            images: Array.isArray(p.images) ? p.images : [],
            collectionIds,
            attributes:
              p.attributes && typeof p.attributes === "object"
                ? p.attributes
                : {},
            inventoryReason: "manual",
            inventoryNotes: "",
            priceReason: "correction",
            priceNotes: "",
          });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load product");
      })
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          sku: form.sku || null,
          description: form.description,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          price: Math.round(parseFloat(form.price) * 100),
          compareAtPrice: form.compareAtPrice
            ? Math.round(parseFloat(form.compareAtPrice) * 100)
            : null,
          cost: form.cost ? Math.round(parseFloat(form.cost) * 100) : 0,
          priceReason: form.priceReason,
          priceNotes: form.priceNotes,
          category: form.category,
          quantity: parseInt(form.quantity, 10) || 0,
          inventoryReason: form.inventoryReason,
          inventoryNotes: form.inventoryNotes,
          images: form.images,
          collections: form.collectionIds,
          attributes: form.attributes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product");
      }
      await Promise.all([
        useProductStore.getState().invalidate(),
        revalidateProducts(),
      ]);
      router.push(backHref);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product");
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h1 className="text-2xl font-bold">Product Not Found</h1>
            <p className="text-base-content/80">
              {error || "The product you're looking for doesn't exist."}
            </p>
            <Link href="/admin/products" className="btn btn-primary mt-4">
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit Product</h1>
              <p className="mt-1 text-base-content/80">
                Update product details and settings
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
              <span className="text-error">ΓÜá∩╕Å</span>
              <p className="text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="tabs tabs-boxed mb-4">
              <button
                type="button"
                className={`tab ${activeTab === "details" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "images" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("images")}
              >
                Images
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "pricing" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("pricing")}
              >
                Pricing
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("inventory")}
              >
                Inventory
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "collections" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("collections")}
              >
                Collections
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "attributes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("attributes")}
              >
                Attributes
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "seo" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("seo")}
              >
                SEO
              </button>
            </div>

            <div className="max-w-2xl">
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
                    required
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
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      Auto-generated from name
                    </span>
                  </label>
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
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={6}
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
                    }
                    required
                  >
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
                {adminUser && (
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg text-sm">
                    <span className="font-medium">Adjusting as:</span>
                    <span>
                      {[adminUser.firstName, adminUser.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                    <span className="text-base-content/60">
                      ({adminUser.email})
                    </span>
                  </div>
                )}
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
                    required
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
                <div className="divider text-sm text-base-content/60">
                  Change Tracking
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Reason for Price Change</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={form.priceReason}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priceReason: e.target.value as
                          | "promotion"
                          | "cost_change"
                          | "market_adjustment"
                          | "correction"
                          | "other",
                      }))
                    }
                  >
                    <option value="correction">Correction</option>
                    <option value="promotion">Promotion / Sale</option>
                    <option value="cost_change">Supplier cost change</option>
                    <option value="market_adjustment">Market adjustment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Notes</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    placeholder="Optional ΓÇö describe why the price is being changed"
                    value={form.priceNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceNotes: e.target.value }))
                    }
                    rows={3}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      This will be recorded in the price log
                    </span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/admin/inventory/${id}?tab=price`}
                    className="btn btn-outline btn-sm"
                  >
                    View Price Log
                  </Link>
                </div>
              </div>

              <div
                className={activeTab !== "inventory" ? "hidden" : "space-y-4"}
              >
                {adminUser && (
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg text-sm">
                    <span className="font-medium">Adjusting as:</span>
                    <span>
                      {[adminUser.firstName, adminUser.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                    <span className="text-base-content/60">
                      ({adminUser.email})
                    </span>
                  </div>
                )}
                <div>
                  <label className="label">
                    <span className="label-text">Quantity</span>
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
                <div>
                  <label className="label">
                    <span className="label-text">Reason for Adjustment</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={form.inventoryReason}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        inventoryReason: e.target.value as
                          | "manual"
                          | "restock"
                          | "adjustment",
                      }))
                    }
                  >
                    <option value="manual">Manual correction</option>
                    <option value="restock">Restock</option>
                    <option value="adjustment">
                      Adjustment (damage, loss, audit, etc.)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Notes</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    placeholder="Optional ΓÇö describe why the inventory is being changed"
                    value={form.inventoryNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, inventoryNotes: e.target.value }))
                    }
                    rows={3}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      This will be recorded in the inventory log
                    </span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/admin/inventory/${id}`}
                    className="btn btn-outline btn-sm"
                  >
                    View Inventory Log
                  </Link>
                  <Link
                    href={`/admin/inventory/${id}?tab=price`}
                    className="btn btn-outline btn-sm"
                  >
                    View Price Log
                  </Link>
                </div>
              </div>

              <div
                className={activeTab !== "collections" ? "hidden" : "space-y-4"}
              >
                <div className="rounded-xl border border-base-300 bg-base-200/50 p-5">
                  <div className="mb-1">
                    <h3 className="text-lg font-semibold">Collections</h3>
                    <p className="text-sm text-base-content/70 mt-0.5">
                      Assign this product to one or more collections.
                    </p>
                  </div>
                  {collections.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 p-6 text-center">
                      <p className="text-sm text-base-content/60 italic">
                        No collections available.{" "}
                        <Link
                          href="/admin/collections/new"
                          className="link link-primary font-medium"
                        >
                          Create one
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-base-content/60 mb-3">
                        {form.collectionIds.length} of {collections.length}{" "}
                        selected
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {collections.map((collection) => {
                          const isSelected = form.collectionIds.includes(
                            collection._id,
                          );
                          return (
                            <label
                              key={collection._id}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-base-300 bg-base-100 hover:border-base-content/20 hover:bg-base-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={isSelected}
                                onChange={() =>
                                  toggleCollection(collection._id)
                                }
                              />
                              <span className="font-medium">
                                {collection.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div
                className={activeTab !== "attributes" ? "hidden" : "space-y-4"}
              >
                <div>
                  <label className="label">
                    <span className="label-text">Custom Attributes</span>
                  </label>
                  <p className="text-sm text-base-content/70 mb-4">
                    Add custom key-value pairs for additional product
                    information.
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
                      onClick={addAttribute}
                    >
                      Add
                    </button>
                  </div>
                  {Object.keys(form.attributes).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(form.attributes).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 p-2 bg-base-200 rounded-lg"
                        >
                          <span className="font-medium flex-1">{key}:</span>
                          <span className="flex-1">{value}</span>
                          <button
                            type="button"
                            className="btn btn-error btn-xs"
                            onClick={() => removeAttribute(key)}
                          >
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
                      setForm((f) => ({
                        ...f,
                        metaDescription: e.target.value,
                      }))
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
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      SavingΓÇª
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <Link href={backHref} className="btn btn-ghost">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}
