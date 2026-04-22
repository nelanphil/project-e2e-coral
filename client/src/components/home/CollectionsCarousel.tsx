"use client";
import { getBaseUrl } from "@/lib/api";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Collection } from "@/lib/types";

const FEATURED_PRODUCTS_PER_SLIDE = 4;

type Props = {
  collections: Collection[];
};

function getVisibleCollections(collections: Collection[]) {
  return collections.filter((c) => c.showInCarousel === true);
}

export function CollectionsCarousel({ collections: initialCollections }: Props) {
  const [collections, setCollections] = useState<Collection[]>(() =>
    getVisibleCollections(initialCollections),
  );
  const [index, setIndex] = useState(0);
  const count = collections.length;

  const fetchVisibleCollections = useCallback(async () => {
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/collections`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list = getVisibleCollections(data.collections ?? []);
      setCollections(list);
      setIndex((i) => (list.length > 0 && i >= list.length ? 0 : i));
    } catch {
      // keep existing state on network error
    }
  }, []);

  useEffect(() => {
    fetchVisibleCollections();
  }, [fetchVisibleCollections]);

  useEffect(() => {
    const onFocus = () => fetchVisibleCollections();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchVisibleCollections]);

  useEffect(() => {
    setCollections(getVisibleCollections(initialCollections));
  }, [initialCollections]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? count - 1 : i - 1));
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= count - 1 ? 0 : i + 1));
  }, [count]);

  useEffect(() => {
    if (count <= 0) return;
    const id = setInterval(goNext, 6000);
    return () => clearInterval(id);
  }, [count, goNext]);

  if (count === 0) return null;

  return (
    <section className="bg-linear-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-2">Collections</h2>
        <p className="text-center text-base-content/70 mb-10 max-w-2xl mx-auto">
          Discover the finest collection of premium corals for enthusiasts and
          collectors
        </p>

        <div className="relative">
          {/* Slides */}
          <div className="overflow-hidden rounded-xl bg-base-100/80 shadow-lg border border-base-300">
            {collections.map((collection, i) => (
              <div
                key={collection._id}
                className={`transition-opacity duration-300 ${
                  i === index ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
                }`}
                aria-hidden={i !== index}
              >
                <div className="p-6 md:p-10">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold">{collection.name}</h3>
                    {(collection.carouselDescription ?? collection.description) && (
                      <p className="mt-2 text-base-content/70 max-w-2xl mx-auto">
                        {collection.carouselDescription || collection.description}
                      </p>
                    )}
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="btn btn-primary btn-sm mt-4"
                    >
                      View collection
                    </Link>
                  </div>

                  {collection.products && collection.products.length > 0 ? (
                    <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      {collection.products
                        .slice(0, FEATURED_PRODUCTS_PER_SLIDE)
                        .map((p) => {
                          const product = typeof p === "string" ? null : p;
                          if (!product) return null;
                          return (
                            <li key={product._id}>
                              <Link
                                href={`/coral/${product.slug}?from=collections`}
                                className="card card-compact bg-base-200 hover:bg-base-300 transition shadow-sm"
                              >
                                <figure className="aspect-[4/3] relative overflow-hidden rounded-lg mt-3 mx-3">
                                  {product.images?.[0] ? (
                                    <Image
                                      src={product.images[0]}
                                      alt={product.name}
                                      fill
                                      sizes="(max-width: 768px) 50vw, 25vw"
                                      className="object-contain"
                                    />
                                  ) : null}
                                </figure>
                                <div className="card-body p-3">
                                  <h4 className="card-title text-sm line-clamp-2">
                                    {product.name}
                                  </h4>
                                  <p className="font-semibold text-sm">
                                    ${(product.price / 100).toFixed(2)}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <p className="text-center text-base-content/50 py-8">
                      No products in this collection yet.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 btn btn-circle btn-ghost shadow-lg bg-base-100/90 hover:bg-base-100 border border-base-300 z-10"
                aria-label="Previous collection"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 btn btn-circle btn-ghost shadow-lg bg-base-100/90 hover:bg-base-100 border border-base-300 z-10"
                aria-label="Next collection"
              >
                <ChevronRight className="size-6" />
              </button>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {collections.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === index ? "bg-primary" : "bg-base-300 hover:bg-base-content/30"
                    }`}
                    aria-label={`Go to collection ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/collections" className="btn btn-primary btn-lg">
            Shop all collections
          </Link>
        </div>
      </div>
    </section>
  );
}
