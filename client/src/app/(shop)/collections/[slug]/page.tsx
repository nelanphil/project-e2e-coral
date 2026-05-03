import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/api-server";
import type { Collection, Product, CollectionsResponse } from "@/lib/types";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export async function generateStaticParams() {
  try {
    const { collections } = await fetchApi<CollectionsResponse>("/api/collections");
    return (collections ?? []).map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const collection = await fetchApi<Collection>(
      `/api/collections/${encodeURIComponent(slug)}`
    );
    const description = collection.description || `Browse the ${collection.name} collection`;
    const firstImage = (collection.products as Product[] | undefined)?.[0]?.images?.[0];
    return {
      title: collection.name,
      description,
      alternates: { canonical: `/collections/${slug}` },
      openGraph: {
        title: collection.name,
        description,
        images: firstImage ? [{ url: firstImage }] : undefined,
      },
      twitter: {
        card: firstImage ? ("summary_large_image" as const) : ("summary" as const),
        title: collection.name,
        description,
      },
    };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  let collection: Collection;
  try {
    collection = await fetchApi<Collection>(
      `/api/collections/${encodeURIComponent(slug)}`
    );
  } catch {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Collection not found.</p>
      </main>
    );
  }

  const products = collection.products ?? [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl || undefined },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${siteUrl}/collections` },
      { "@type": "ListItem", position: 3, name: collection.name, item: `${siteUrl}/collections/${slug}` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: collection.name,
    url: `${siteUrl}/collections/${slug}`,
    itemListElement: (products as Product[]).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/coral/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <nav className="text-sm text-base-content/70 mb-4">
        <Link href="/store">Store</Link> /{" "}
        <Link href="/collections">Collections</Link> /{" "}
        <span>{collection.name}</span>
      </nav>
      <h1 className="text-2xl font-bold">{collection.name}</h1>
      {collection.description ? (
        <p className="text-base-content/70 mt-2 max-w-2xl">
          {collection.description}
        </p>
      ) : null}
      {products.length === 0 ? (
        <p className="text-base-content/70 py-8">No products in this collection.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p: Product) => (
            <li key={p._id}>
              <div className="card card-compact bg-base-100 shadow hover:shadow-md transition flex flex-col h-full">
                <Link
                  href={`/coral/${p.slug}?from=collections`}
                  className="flex flex-col flex-1"
                >
                  <figure className="aspect-[4/3] relative shrink-0 overflow-hidden rounded-lg mt-3 mx-3">
                    {p.images?.[0] ? (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-contain"
                      />
                    ) : null}
                  </figure>
                  <div className="card-body">
                    <h2 className="card-title text-lg">{p.name}</h2>
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
    </main>
  );
}
