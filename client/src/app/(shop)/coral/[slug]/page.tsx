import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api-server";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { SanitizedHtml } from "@/components/SanitizedHtml";
import { stripHtml } from "@/lib/strip-html";
import type { Product, ProductsResponse } from "@/lib/types";

export async function generateStaticParams() {
  try {
    const { products } = await fetchApi<ProductsResponse>(
      "/api/products?limit=500",
    );
    return (products ?? []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const product = await fetchApi<Product>(
      `/api/products/${encodeURIComponent(slug)}`,
    );
    const plainDescription =
      product.metaDescription ||
      stripHtml(product.description) ||
      undefined;
    return {
      title: product.metaTitle || product.name,
      description: plainDescription,
      alternates: { canonical: `/coral/${slug}` },
      openGraph: {
        title: product.metaTitle || product.name,
        description: plainDescription,
        images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: product.metaTitle || product.name,
        description: plainDescription,
      },
    };
  } catch {
    return { title: "Product" };
  }
}

function hasContent(value: string | null | undefined): value is string {
  return value != null && String(value).trim() !== "";
}

export default async function CoralProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  let product: Product;
  try {
    product = await fetchApi<Product>(
      `/api/products/${encodeURIComponent(slug)}`,
    );
  } catch {
    notFound();
  }
  const category =
    typeof product.category === "object" ? product.category : null;

  const qty = product.inventory?.quantity ?? 0;

  const breadcrumbFrom = from === "collections" ? "collections" : "store";
  const rootLabel = breadcrumbFrom === "collections" ? "Collections" : "Store";
  const rootHref = breadcrumbFrom === "collections" ? "/collections" : "/store";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.description) || product.name,
    image: product.images?.[0],
    offers: {
      "@type": "Offer",
      price: product.price / 100,
      priceCurrency: "USD",
      availability:
        qty > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
  if (product.sku) {
    jsonLd.sku = product.sku;
  }

  const breadcrumbItems: { name: string; item?: string }[] = [
    { name: "Home", item: `${process.env.NEXT_PUBLIC_SITE_URL || ""}` },
    { name: "Store", item: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/store` },
  ];
  if (category) {
    breadcrumbItems.push({
      name: category.name,
      item: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/category/${category.slug}`,
    });
  }
  breadcrumbItems.push({ name: product.name });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.item ? { item: item.item } : {}),
    })),
  };

  const attributes = product.attributes ?? {};
  const hasAttributes =
    typeof attributes === "object" && Object.keys(attributes).length > 0;

  return (
    <main className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="text-sm text-base-content/70 mb-4" aria-label="Breadcrumb">
        <Link href={rootHref}>{rootLabel}</Link>
        {category && (
          <>
            {" / "}
            <Link
              href={
                breadcrumbFrom === "store"
                  ? `/store?category=${encodeURIComponent(category.slug)}`
                  : `/category/${category.slug}?from=collections`
              }
            >
              {category.name}
            </Link>
          </>
        )}
        {" / "}
        <span>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:max-w-md md:min-w-0">
          <ProductImageGallery
            images={product.images ?? []}
            alt={product.name}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold flex items-center gap-2">
              <span>${(product.price / 100).toFixed(2)}</span>
              {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                <span className="text-base text-base-content/50 line-through">
                  ${(product.compareAtPrice / 100).toFixed(2)}
                </span>
              )}
            </p>
            <AddToCartButton productId={product._id} availableQuantity={qty} className="mt-0" />
          </div>
          {hasContent(product.description) && (
            <div className="card bg-base-100 shadow mt-6">
              <div className="card-body">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <SanitizedHtml
                  html={product.description}
                  className="text-base-content/80 prose prose-sm max-w-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-6 border-t border-base-300 pt-8">
        {hasContent(product.whyChoose) && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="text-xl font-semibold mb-3">Why Choose</h2>
              <SanitizedHtml
                html={product.whyChoose}
                className="text-base-content/80 prose prose-sm max-w-none"
              />
            </div>
          </div>
        )}

        {(hasContent(product.keyFeatures) || hasContent(product.colorVariation)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasContent(product.keyFeatures) && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="text-xl font-semibold mb-3">Key Features</h2>
                  <SanitizedHtml
                    html={product.keyFeatures}
                    className="text-base-content/80 prose prose-sm max-w-none"
                  />
                </div>
              </div>
            )}
            {hasContent(product.colorVariation) && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="text-xl font-semibold mb-3">Color Variation</h2>
                  <SanitizedHtml
                    html={product.colorVariation}
                    className="text-base-content/80 prose prose-sm max-w-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(hasContent(product.growthHabit) || hasContent(product.optimalCare)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasContent(product.growthHabit) && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="text-xl font-semibold mb-3">Growth Habit</h2>
                  <SanitizedHtml
                    html={product.growthHabit}
                    className="text-base-content/80 prose prose-sm max-w-none"
                  />
                </div>
              </div>
            )}
            {hasContent(product.optimalCare) && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="text-xl font-semibold mb-3">Optimal Care</h2>
                  <SanitizedHtml
                    html={product.optimalCare}
                    className="text-base-content/80 prose prose-sm max-w-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {hasContent(product.idealCompatibility) && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="text-xl font-semibold mb-3">Ideal Compatibility</h2>
              <SanitizedHtml
                html={product.idealCompatibility}
                className="text-base-content/80 prose prose-sm max-w-none"
              />
            </div>
          </div>
        )}

        {hasAttributes && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="text-xl font-semibold mb-3">Product Details</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <tbody>
                    {Object.entries(attributes).map(([key, value]) => (
                      <tr key={key}>
                        <th className="w-1/3">{key}</th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
