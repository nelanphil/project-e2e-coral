"use client";

import { create } from "zustand";
import type { Product, Category, Collection, ProductsResponse, CategoriesResponse, CollectionsResponse } from "@/lib/types";

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";

export interface ProductState {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  categories: Category[];
  collections: Collection[];
  productDetail: Product | null;
  productsLoading: boolean;
  categoriesLoading: boolean;
  collectionsLoading: boolean;
  productDetailLoading: boolean;
  lastFetchedAt: number;

  setProducts: (data: { products: Product[]; total: number; page: number; limit: number }) => void;
  setCategories: (categories: Category[]) => void;
  setCollections: (collections: Collection[]) => void;
  setProductDetail: (product: Product | null) => void;

  /** Optimistically patch a single product in the list without refetching. */
  updateProductInList: (productId: string, updates: Partial<Product>) => void;
  /** Remove a product from the local list (e.g. after soft-delete). */
  removeProductFromList: (productId: string) => void;

  fetchProducts: (params?: { page?: number; limit?: number; category?: string; q?: string; sort?: string; order?: "asc" | "desc"; status?: string; hidden?: string }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCollections: () => Promise<void>;
  fetchProductBySlug: (slug: string) => Promise<Product | null>;
  /** Mark data as stale and re-fetch products, categories, and collections. */
  invalidate: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  total: 0,
  page: 1,
  limit: 12,
  categories: [],
  collections: [],
  productDetail: null,
  productsLoading: false,
  categoriesLoading: false,
  collectionsLoading: false,
  productDetailLoading: false,
  lastFetchedAt: 0,

  setProducts: (data) => set(data),

  setCategories: (categories) => set({ categories }),

  setCollections: (collections) => set({ collections }),

  setProductDetail: (productDetail) => set({ productDetail }),

  updateProductInList: (productId, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p._id === productId ? { ...p, ...updates } : p,
      ),
    })),

  removeProductFromList: (productId) =>
    set((state) => ({
      products: state.products.filter((p) => p._id !== productId),
      total: state.total - 1,
    })),

  fetchProducts: async (params = {}) => {
    set({ productsLoading: true });
    const { page = 1, limit = 12, category, q, sort, order, status, hidden } = params;
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("limit", String(limit));
    if (category) search.set("category", category);
    if (q) search.set("q", q);
    if (sort) search.set("sort", sort);
    if (order) search.set("order", order);
    if (status) search.set("status", status);
    if (hidden) search.set("hidden", hidden);
    search.set("_t", String(Date.now()));
    try {
      const res = await fetch(`${getApiUrl()}/api/products?${search}`);
      const data: ProductsResponse = await res.json();
      set({
        products: data.products ?? [],
        total: data.total ?? 0,
        page: data.page ?? page,
        limit: data.limit ?? limit,
        productsLoading: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ products: [], total: 0, page: 1, limit: 12, productsLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ categoriesLoading: true });
    try {
      const res = await fetch(`${getApiUrl()}/api/categories`);
      const data: CategoriesResponse = await res.json();
      set({ categories: data.categories ?? [], categoriesLoading: false });
    } catch {
      set({ categories: [], categoriesLoading: false });
    }
  },

  fetchCollections: async () => {
    set({ collectionsLoading: true });
    try {
      const res = await fetch(`${getApiUrl()}/api/collections`);
      const data: CollectionsResponse = await res.json();
      set({ collections: data.collections ?? [], collectionsLoading: false });
    } catch {
      set({ collections: [], collectionsLoading: false });
    }
  },

  fetchProductBySlug: async (slug: string) => {
    set({ productDetailLoading: true, productDetail: null });
    try {
      const res = await fetch(`${getApiUrl()}/api/products/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        set({ productDetailLoading: false });
        return null;
      }
      const product: Product = await res.json();
      set({ productDetail: product, productDetailLoading: false });
      return product;
    } catch {
      set({ productDetail: null, productDetailLoading: false });
      return null;
    }
  },

  invalidate: async () => {
    set({ lastFetchedAt: 0 });
    await Promise.all([get().fetchProducts(), get().fetchCategories(), get().fetchCollections()]);
  },
}));
