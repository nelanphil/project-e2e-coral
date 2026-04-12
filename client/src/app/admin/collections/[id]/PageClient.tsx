"use client";
import { getBaseUrl } from "@/lib/api";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { revalidateCollections } from "@/app/actions/revalidate";
import { getAuthToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import type { Collection } from "@/lib/types";
import type { Product } from "@/lib/types";

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

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
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
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "products">("details");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api(`/api/collections/id/${id}`).then((r) => r.json()),
      api("/api/products?limit=1000").then((r) => r.json()),
    ]).then(([cData, pData]) => {
      if (cData._id) {
        setCollection(cData);
        setForm({
          name: cData.name,
          slug: cData.slug,
          description: cData.description ?? "",
          carouselDescription: cData.carouselDescription ?? "",
          showInCarousel: cData.showInCarousel ?? false,
        });
        setTags(cData.tags ?? []);
      }
      setAllProducts(pData.products ?? []);
    });
  }, [id]);

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
    const res = await api(`/api/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
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
      alert(error.error || "Failed to update collection");
    }
  }

  async function handleAddProducts() {
    if (selectedProductIds.length === 0) return;
    setLoading(true);
    const res = await api(`/api/collections/${id}/products`, {
      method: "POST",
      body: JSON.stringify({ productIds: selectedProductIds }),
    });
    setLoading(false);
    if (res.ok) {
      await revalidateCollections();
      const updated = await res.json();
      setCollection(updated);
      setSelectedProductIds([]);
      setProductSearch("");
    } else {
      const error = await res.json();
      alert(error.error || "Failed to add products");
    }
  }

  async function handleRemoveProduct(productId: string) {
    if (!confirm("Remove this product from the collection?")) return;
    setLoading(true);
    const res = await api(`/api/collections/${id}/products/${productId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      await revalidateCollections();
      const updated = await res.json();
      setCollection(updated);
    } else {
      alert("Failed to remove product");
    }
  }

  const currentProductIds =
    collection?.products?.map((p) => (typeof p === "string" ? p : p._id)) ?? [];
  const availableProducts = allProducts.filter(
    (p) =>
      !currentProductIds.includes(p._id) &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(productSearch.toLowerCase())),
  );

  if (!collection) return <p>LoadingΓÇª</p>;

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title text-2xl">Edit collection</h1>

          <div className="tabs tabs-boxed mb-4">
            <button
              type="button"
              className={`tab ${activeTab === "details" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("details")}>
              Details
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "products" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("products")}>
              Products ({collection.products?.length ?? 0})
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={activeTab !== "details" ? "hidden" : "space-y-4"}>
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
                    setForm((f) => ({
                      ...f,
                      carouselDescription: e.target.value,
                    }))
                  }
                  placeholder="Short text shown on the home page collections carousel for this collection"
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
                      setForm((f) => ({
                        ...f,
                        showInCarousel: e.target.checked,
                      }))
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
                    disabled={!tagInput.trim()}>
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
                          onClick={() => handleRemoveTag(tag)}>
                          ├ù
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
                  disabled={loading}>
                  {loading ? "SavingΓÇª" : "Save"}
                </button>
                <Link href="/admin/collections" className="btn btn-ghost">
                  Cancel
                </Link>
              </div>
            </div>

            <div className={activeTab !== "products" ? "hidden" : "space-y-4"}>
              <div>
                <label className="label">Add Products</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {productSearch && availableProducts.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                    {availableProducts.map((p) => (
                      <label
                        key={p._id}
                        className="flex items-center gap-2 p-2 hover:bg-base-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedProductIds.includes(p._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([
                                ...selectedProductIds,
                                p._id,
                              ]);
                            } else {
                              setSelectedProductIds(
                                selectedProductIds.filter((id) => id !== p._id),
                              );
                            }
                          }}
                        />
                        <span>{p.name}</span>
                        <span className="text-sm text-base-content/60">
                          ({p.slug})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedProductIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={handleAddProducts}
                    disabled={loading}>
                    Add {selectedProductIds.length} product
                    {selectedProductIds.length > 1 ? "s" : ""}
                  </button>
                )}
              </div>

              <div className="divider">Current Products</div>

              {collection.products && collection.products.length > 0 ? (
                <div className="space-y-2">
                  {collection.products.map((p) => {
                    const product =
                      typeof p === "string"
                        ? allProducts.find((ap) => ap._id === p)
                        : p;
                    if (!product) return null;
                    const productId = typeof p === "string" ? p : p._id;
                    return (
                      <div
                        key={productId}
                        className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-base-content/60">
                            {product.slug}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleRemoveProduct(productId)}
                          disabled={loading}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-base-content/60">
                  No products in this collection yet.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
