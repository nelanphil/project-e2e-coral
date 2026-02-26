"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { stripHtml } from "@/lib/strip-html";
import type { Product, Category } from "@/lib/types";
import { useProductStore } from "@/stores/product-store";

type Props = {
  products: Product[];
  categories: Category[];
  total: number;
};

const STALE_MS = 30_000;

export function HomeProductGrid({
  products: initialProducts,
  categories: initialCategories,
  total: initialTotal,
}: Props) {
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
  const total = useProductStore((s) => s.total);
  const lastFetchedAt = useProductStore((s) => s.lastFetchedAt);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchCategories = useProductStore((s) => s.fetchCategories);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (lastFetchedAt === 0) {
        useProductStore.setState({
          products: initialProducts,
          categories: initialCategories,
          total: initialTotal,
          lastFetchedAt: Date.now(),
        });
      }
    }
  }, [initialProducts, initialCategories, initialTotal, lastFetchedAt]);

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

  const displayProducts = products.length > 0 ? products : initialProducts;
  const displayCategories = categories.length > 0 ? categories : initialCategories;
  const displayTotal = products.length > 0 ? total : initialTotal;

  return (
    <>
      {displayCategories.length > 0 && (
        <nav className="mt-4 flex gap-2 flex-wrap">
          {displayCategories.map((cat) => (
            <Link
              key={cat._id}
              href={`/category/${cat.slug}`}
              className="btn btn-sm btn-outline"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}
      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProducts.map((p) => (
          <li key={p._id}>
            <Link
              href={`/coral/${p.slug}?from=store`}
              className="card card-compact bg-base-100 shadow hover:shadow-md transition"
            >
              <figure className="bg-base-200 h-48" />
              <div className="card-body">
                <h2 className="card-title text-lg">{p.name}</h2>
                <p className="text-sm text-base-content/80 line-clamp-2">
                  {stripHtml(p.description)}
                </p>
                <p className="font-semibold flex items-center gap-2">
                  <span>${(p.price / 100).toFixed(2)}</span>
                  {p.compareAtPrice != null && p.compareAtPrice > p.price && (
                    <span className="text-sm text-base-content/50 line-through font-normal">
                      ${(p.compareAtPrice / 100).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {displayTotal > displayProducts.length && (
        <p className="mt-4 text-base-content/70">
          Showing {displayProducts.length} of {displayTotal} products.
        </p>
      )}
    </>
  );
}
