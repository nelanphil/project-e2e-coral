"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { Collection, Product } from "@/lib/types";

type SortOrder = "asc" | "desc";

interface CollectionsListProps {
  collections: Collection[];
}

export function CollectionsList({ collections: initialCollections }: CollectionsListProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedCollections = useMemo(() => {
    return [...initialCollections].sort((a, b) => {
      const nameA = (a.name ?? "").trim().toLowerCase();
      const nameB = (b.name ?? "").trim().toLowerCase();
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [initialCollections, sortOrder]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Collections</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">Sort by name:</span>
          <select
            className="select select-bordered select-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            aria-label="Sort collections by name"
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </div>
      </div>
      <div className="space-y-16">
        {sortedCollections.map((collection) => {
          const products = collection.products ?? [];
          const displayProducts =
            products.length > 8 ? products.slice(0, 8) : products;

          return (
            <section key={collection._id}>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold">{collection.name}</h2>
                  {collection.description ? (
                    <p className="text-base-content/70 mt-1 max-w-2xl">
                      {collection.description}
                    </p>
                  ) : null}
                </div>
                {products.length > 0 && (
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="btn btn-primary btn-sm"
                  >
                    View Collection
                  </Link>
                )}
              </div>
              {displayProducts.length === 0 ? (
                <p className="text-base-content/70 py-6">
                  No products in this collection.
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayProducts.map((p: Product) => (
                    <li key={p._id}>
                      <div className="card card-compact bg-base-100 shadow hover:shadow-md transition flex flex-col h-full">
                        <Link
                          href={`/coral/${p.slug}?from=collections`}
                          className="flex flex-col flex-1"
                        >
                          <figure className="bg-base-200 h-48 relative shrink-0 overflow-hidden">
                            {p.images?.[0] ? (
                              <Image
                                src={p.images[0]}
                                alt={p.name}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover"
                              />
                            ) : null}
                          </figure>
                          <div className="card-body">
                            <h3 className="card-title text-lg">{p.name}</h3>
                          </div>
                        </Link>
                        <div className="px-4 pb-4 flex items-center justify-between gap-2">
                          <p className="font-semibold flex items-center gap-2">
                            <span>${(p.price / 100).toFixed(2)}</span>
                            {"compareAtPrice" in p &&
                              p.compareAtPrice != null &&
                              p.compareAtPrice > p.price && (
                                <span className="text-sm text-base-content/50 line-through font-normal">
                                  ${(p.compareAtPrice! / 100).toFixed(2)}
                                </span>
                              )}
                          </p>
                          <AddToCartButton productId={p._id} availableQuantity={p.inventory?.quantity} className="btn-sm mt-0 shrink-0" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {sortedCollections.length === 0 && (
        <p className="text-base-content/70 py-8">No collections yet.</p>
      )}
    </>
  );
}
