"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Search,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { stripHtml } from "@/lib/strip-html";
import type { Product, Category } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";
import { useProductStore } from "@/stores/product-store";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

const ALLOWED_LIMITS_DEFAULT = [50, 100, 150] as const;

type StoreViewProps = {
  products: Product[];
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  allowedLimits?: readonly number[];
  initialCategorySlug?: string | null;
  initialSearchQuery?: string | null;
};

const GRID_COLS = [4, 6] as const;
const STALE_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 400;

export function StoreView({
  products: initialProducts,
  categories: initialCategories,
  total: initialTotal,
  page: initialPage,
  limit: initialLimit,
  allowedLimits = ALLOWED_LIMITS_DEFAULT,
  initialCategorySlug,
  initialSearchQuery,
}: StoreViewProps) {
  const categories = useProductStore((s) => s.categories);
  const setProducts = useProductStore((s) => s.setProducts);
  const lastFetchedAt = useProductStore((s) => s.lastFetchedAt);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchCategories = useProductStore((s) => s.fetchCategories);
  const router = useRouter();

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (lastFetchedAt === 0) {
        useProductStore.setState({
          products: initialProducts,
          categories: initialCategories,
          total: initialTotal,
          page: initialPage,
          limit: initialLimit,
          lastFetchedAt: Date.now(),
        });
      }
    }
  }, [
    initialProducts,
    initialCategories,
    initialTotal,
    initialPage,
    initialLimit,
    lastFetchedAt,
  ]);

  // Sync store when server passes new page/limit (e.g. after navigation)
  useEffect(() => {
    setProducts({
      products: initialProducts,
      total: initialTotal,
      page: initialPage,
      limit: initialLimit,
    });
  }, [initialProducts, initialTotal, initialPage, initialLimit, setProducts]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - useProductStore.getState().lastFetchedAt > STALE_MS) {
        fetchProducts();
        fetchCategories();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchProducts, fetchCategories]);

  const [columns, setColumns] = useState<4 | 6>(4);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearchQuery ?? "");
  /** Trimmed `q` we last sent via router.replace; used to avoid clobbering the input when RSC catches up. */
  const pendingCommittedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const urlTrim = (initialSearchQuery ?? "").trim();
    const pending = pendingCommittedQueryRef.current;
    if (pending !== null && urlTrim === pending) {
      pendingCommittedQueryRef.current = null;
      return;
    }
    // Intentional: sync URL-driven prop back to local input when they diverge.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(initialSearchQuery ?? "");
  }, [initialSearchQuery]);

  // Debounced URL update so search runs server-side across all products (all pagination)
  const searchInputRef = useRef(searchInput);
  const initialSearchQueryRef = useRef(initialSearchQuery);
  const initialCategorySlugRef = useRef(initialCategorySlug);
  const displayLimitRef = useRef(initialLimit);
  useEffect(() => {
    searchInputRef.current = searchInput;
    initialSearchQueryRef.current = initialSearchQuery;
    initialCategorySlugRef.current = initialCategorySlug;
    displayLimitRef.current = initialLimit;
  }, [searchInput, initialSearchQuery, initialCategorySlug, initialLimit]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    const currentQ = (initialSearchQuery ?? "").trim();
    if (trimmed === currentQ) return;

    const t = setTimeout(() => {
      const nextTrimmed = searchInputRef.current.trim();
      if (nextTrimmed === (initialSearchQueryRef.current ?? "").trim()) return;
      const params = new URLSearchParams();
      if (initialCategorySlugRef.current)
        params.set("category", initialCategorySlugRef.current);
      if (nextTrimmed) params.set("q", nextTrimmed);
      if (displayLimitRef.current !== 50)
        params.set("limit", String(displayLimitRef.current));
      const qs = params.toString();
      pendingCommittedQueryRef.current = nextTrimmed;
      router.replace(qs ? `/store?${qs}` : "/store");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, initialSearchQuery, router]);

  // Use server-passed data for display so visibility-triggered fetchProducts() (wrong params) doesn't shrink the list
  const displayProducts = initialProducts;
  const displayCategories =
    categories.length > 0 ? categories : initialCategories;
  const storeCategories = useMemo(
    () => filterDisplayCategories(displayCategories),
    [displayCategories],
  );
  const selectedCategoryId = useMemo(() => {
    if (!initialCategorySlug) return null;
    return (
      storeCategories.find((c) => c.slug === initialCategorySlug)?._id ?? null
    );
  }, [storeCategories, initialCategorySlug]);
  const selectedCategory = useMemo(
    () =>
      selectedCategoryId
        ? (storeCategories.find((c) => c._id === selectedCategoryId) ?? null)
        : null,
    [storeCategories, selectedCategoryId],
  );
  const displayTotal = initialTotal;
  const displayPage = initialPage;
  const displayLimit = initialLimit;

  const totalPages = Math.max(1, Math.ceil(displayTotal / displayLimit));
  const buildStoreUrl = (opts: {
    page?: number;
    limit?: number;
    categorySlug?: string | null;
    searchQuery?: string | null;
  }) => {
    const p = opts.page ?? displayPage;
    const l = opts.limit ?? displayLimit;
    const params = new URLSearchParams();
    if (opts.categorySlug) params.set("category", opts.categorySlug);
    const qVal =
      opts.searchQuery !== undefined ? opts.searchQuery : initialSearchQuery;
    if (qVal) params.set("q", qVal);
    if (p > 1) params.set("page", String(p));
    if (l !== 50) params.set("limit", String(l));
    const qs = params.toString();
    return qs ? `/store?${qs}` : "/store";
  };

  const filteredProducts = useMemo(() => {
    let list = displayProducts;
    if (selectedCategoryId) {
      list = list.filter((p) => {
        const cat = p.category;
        return typeof cat === "object"
          ? cat._id === selectedCategoryId
          : cat === selectedCategoryId;
      });
    }
    const search = searchInput.trim().toLowerCase();
    if (!search) return list;
    return list.filter((p) => p.name.toLowerCase().includes(search));
  }, [displayProducts, selectedCategoryId, searchInput]);

  return (
    <div className="flex min-h-0 w-full gap-4">
      {/* Mobile filter overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200 ${
          mobileFiltersOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileFiltersOpen}
        onClick={() => setMobileFiltersOpen(false)}
      />

      {/* Left sidebar: filters in card — below nav on mobile */}
      <aside
        className={`
          fixed left-0 top-[var(--header-height)] z-50 h-[calc(100vh-var(--header-height))] w-64 shrink-0 transform transition-transform duration-200 ease-out lg:top-0 lg:h-full lg:static lg:z-auto lg:block lg:translate-x-0
          ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Filters">
        <div className="card h-full w-full bg-base-100 shadow border border-base-300">
          <div className="card-body p-0 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between border-b border-base-300 p-4 shrink-0">
              <h2 className="card-title text-lg m-0">Filters</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square lg:hidden"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="store-search"
                    className="flex items-center gap-2 text-sm font-medium text-base-content/70 mb-2">
                    <Search className="size-4 shrink-0" aria-hidden />
                    Search by name
                  </label>
                  <input
                    id="store-search"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Product name..."
                    className="input input-bordered input-sm w-full"
                    aria-label="Search products by name"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left text-sm font-medium text-base-content/70 hover:text-base-content"
                    onClick={() => setCategoryFilterOpen((o) => !o)}
                    aria-expanded={categoryFilterOpen}
                    aria-controls="store-category-list">
                    {categoryFilterOpen ? (
                      <Minus className="size-4 shrink-0" aria-hidden />
                    ) : (
                      <Plus className="size-4 shrink-0" aria-hidden />
                    )}
                    <span>Category</span>
                  </button>
                  <ul
                    id="store-category-list"
                    className={`menu menu-vertical rounded-box gap-1 bg-transparent p-0 transition-all ${
                      categoryFilterOpen ? "visible" : "hidden"
                    }`}
                    role="list">
                    <li>
                      <Link
                        href={buildStoreUrl({ page: 1, categorySlug: null })}
                        className={selectedCategoryId === null ? "active" : ""}
                        onClick={() => setMobileFiltersOpen(false)}>
                        All
                      </Link>
                    </li>
                    {storeCategories.map((cat) => (
                      <li key={cat._id}>
                        <Link
                          href={buildStoreUrl({
                            page: 1,
                            categorySlug: cat.slug,
                          })}
                          className={
                            selectedCategoryId === cat._id ? "active" : ""
                          }
                          onClick={() => setMobileFiltersOpen(false)}>
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content: products in card */}
      <div className="min-w-0 flex-1">
        <div className="card w-full bg-base-100 shadow border border-base-300">
          <div className="card-body">
            {/* Toolbar: mobile filter button + per-page + column selector (desktop) */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-base-300">
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2 lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
                aria-label="Open filters">
                <Filter className="size-5" />
                Filters
              </button>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-base-content/70">
                    Per page:
                  </span>
                  <div className="join">
                    {allowedLimits.map((n) => (
                      <Link
                        key={n}
                        href={buildStoreUrl({
                          page: 1,
                          limit: n,
                          categorySlug: initialCategorySlug ?? null,
                        })}
                        className={`join-item btn btn-sm ${displayLimit === n ? "btn-active" : ""}`}
                        aria-label={`${n} products per page`}
                        aria-current={displayLimit === n ? "true" : undefined}>
                        {n}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="hidden items-center gap-2 lg:flex">
                  <span className="text-sm text-base-content/70">Per row:</span>
                  <div className="join">
                    {GRID_COLS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`join-item btn btn-sm ${columns === n ? "btn-active" : ""}`}
                        onClick={() => setColumns(n)}
                        aria-label={`${n} products per row`}
                        aria-pressed={columns === n}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active filters indicator */}
            {(selectedCategory || searchInput.trim()) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pb-2 border-b border-base-300">
                {selectedCategory && (
                  <>
                    <span className="text-sm text-base-content/70">
                      Filtering by:
                    </span>
                    <span className="badge badge-primary badge-lg gap-1">
                      {selectedCategory.name}
                    </span>
                    <Link
                      href={buildStoreUrl({ page: 1, categorySlug: null })}
                      className="link link-hover text-sm text-primary">
                      Clear filter
                    </Link>
                  </>
                )}
                {searchInput.trim() && (
                  <>
                    <span className="text-sm text-base-content/70">
                      Search:
                    </span>
                    <span className="badge badge-secondary badge-lg">
                      &ldquo;{searchInput.trim()}&rdquo;
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="link link-hover text-sm text-primary">
                      Clear search
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Pagination + count at top */}
            {filteredProducts.length > 0 && (
              <>
                <p className="mt-4 text-sm text-base-content/70">
                  {selectedCategoryId
                    ? `Showing ${filteredProducts.length} filtered of ${displayTotal} products.`
                    : `Showing ${(displayPage - 1) * displayLimit + 1}–${Math.min(displayPage * displayLimit, displayTotal)} of ${displayTotal} products.`}
                </p>
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Link
                      href={
                        displayPage <= 1
                          ? "#"
                          : buildStoreUrl({
                              page: displayPage - 1,
                              categorySlug: initialCategorySlug ?? null,
                            })
                      }
                      className={`btn btn-sm btn-ghost join-item ${displayPage <= 1 ? "btn-disabled pointer-events-none" : ""}`}
                      aria-label="Previous page">
                      <ChevronLeft className="size-4" />
                    </Link>
                    <div className="join">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          if (Math.abs(p - displayPage) <= 1) return true;
                          return false;
                        })
                        .reduce<number[]>((acc, p, i, arr) => {
                          if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push(-1);
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === -1 ? (
                            <span
                              key={`ellipsis-top-${idx}`}
                              className="join-item btn btn-sm btn-ghost btn-disabled no-animation">
                              …
                            </span>
                          ) : (
                            <Link
                              key={p}
                              href={buildStoreUrl({
                                page: p,
                                categorySlug: initialCategorySlug ?? null,
                              })}
                              className={`join-item btn btn-sm ${displayPage === p ? "btn-active" : ""}`}
                              aria-label={`Page ${p}`}
                              aria-current={
                                displayPage === p ? "page" : undefined
                              }>
                              {p}
                            </Link>
                          ),
                        )}
                    </div>
                    <Link
                      href={
                        displayPage >= totalPages
                          ? "#"
                          : buildStoreUrl({
                              page: displayPage + 1,
                              categorySlug: initialCategorySlug ?? null,
                            })
                      }
                      className={`btn btn-sm btn-ghost join-item ${displayPage >= totalPages ? "btn-disabled pointer-events-none" : ""}`}
                      aria-label="Next page">
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Product grid: 2 cols mobile, 4 or 6 desktop */}
            <ul
              className={`grid gap-6 grid-cols-1 sm:grid-cols-2 mt-6 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-6"}`}>
              {filteredProducts.map((p) => (
                <li key={p._id}>
                  <div className="card card-compact bg-base-100 shadow hover:shadow-md transition h-full flex flex-col">
                    <Link
                      href={`/coral/${p.slug}?from=store`}
                      className="flex flex-col flex-1">
                      <figure className="aspect-[4/3] relative shrink-0 overflow-hidden rounded-lg mt-3 mx-3">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-contain"
                          />
                        ) : null}
                      </figure>
                      <div className="card-body flex-1">
                        <h2 className="card-title text-lg">{p.name}</h2>
                        <p className="text-sm text-base-content/80 line-clamp-2 flex-1">
                          {stripHtml(p.description)}
                        </p>
                      </div>
                    </Link>
                    <div className="px-4 pb-4 flex items-center justify-between gap-2">
                      <p className="font-semibold flex items-center gap-2">
                        <span>${(p.price / 100).toFixed(2)}</span>
                        {p.compareAtPrice != null &&
                          p.compareAtPrice > p.price && (
                            <span className="text-sm text-base-content/50 line-through font-normal">
                              ${(p.compareAtPrice / 100).toFixed(2)}
                            </span>
                          )}
                      </p>
                      <AddToCartButton
                        productId={p._id}
                        availableQuantity={p.inventory?.quantity}
                        className="btn-sm mt-0 shrink-0"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {filteredProducts.length === 0 && (
              <p className="py-12 text-center text-base-content/70">
                No products match the selected filters.
              </p>
            )}

            {filteredProducts.length > 0 && (
              <>
                <p className="mt-4 text-sm text-base-content/70">
                  {selectedCategoryId
                    ? `Showing ${filteredProducts.length} filtered of ${displayTotal} products.`
                    : `Showing ${(displayPage - 1) * displayLimit + 1}–${Math.min(displayPage * displayLimit, displayTotal)} of ${displayTotal} products.`}
                </p>
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Link
                      href={
                        displayPage <= 1
                          ? "#"
                          : buildStoreUrl({
                              page: displayPage - 1,
                              categorySlug: initialCategorySlug ?? null,
                            })
                      }
                      className={`btn btn-sm btn-ghost join-item ${displayPage <= 1 ? "btn-disabled pointer-events-none" : ""}`}
                      aria-label="Previous page">
                      <ChevronLeft className="size-4" />
                    </Link>
                    <div className="join">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          if (Math.abs(p - displayPage) <= 1) return true;
                          return false;
                        })
                        .reduce<number[]>((acc, p, i, arr) => {
                          if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push(-1);
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === -1 ? (
                            <span
                              key={`ellipsis-b-${idx}`}
                              className="join-item btn btn-sm btn-ghost btn-disabled no-animation">
                              …
                            </span>
                          ) : (
                            <Link
                              key={p}
                              href={buildStoreUrl({
                                page: p,
                                categorySlug: initialCategorySlug ?? null,
                              })}
                              className={`join-item btn btn-sm ${displayPage === p ? "btn-active" : ""}`}
                              aria-label={`Page ${p}`}
                              aria-current={
                                displayPage === p ? "page" : undefined
                              }>
                              {p}
                            </Link>
                          ),
                        )}
                    </div>
                    <Link
                      href={
                        displayPage >= totalPages
                          ? "#"
                          : buildStoreUrl({
                              page: displayPage + 1,
                              categorySlug: initialCategorySlug ?? null,
                            })
                      }
                      className={`btn btn-sm btn-ghost join-item ${displayPage >= totalPages ? "btn-disabled pointer-events-none" : ""}`}
                      aria-label="Next page">
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
