import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/api-server";
import type { Category, CategoriesResponse } from "@/lib/types";
import type { ProductsResponse } from "@/lib/types";

export async function generateStaticParams() {
  try {
    const { categories } = await fetchApi<CategoriesResponse>("/api/categories");
    return (categories ?? []).map((c) => ({ slug: c.slug }));
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
    const category = await fetchApi<Category>(`/api/categories/${encodeURIComponent(slug)}`);
    const description = `Browse ${category.name} corals`;
    return {
      title: category.name,
      description,
      alternates: { canonical: `/category/${slug}` },
      openGraph: {
        title: category.name,
        description,
      },
      twitter: {
        card: "summary" as const,
        title: category.name,
        description,
      },
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  let category: Category;
  try {
    category = await fetchApi<Category>(`/api/categories/${encodeURIComponent(slug)}`);
  } catch {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Category not found.</p>
      </main>
    );
  }
  const { products } = await fetchApi<ProductsResponse>(`/api/products?category=${category._id}&limit=24`);

  const fromCollections = from === "collections";
  const rootLabel = fromCollections ? "Collections" : "Home";
  const rootHref = fromCollections ? "/collections" : "/";

  return (
    <main className="container mx-auto px-4 py-8">
      <nav className="text-sm text-base-content/70 mb-4" aria-label="Breadcrumb">
        <Link href={rootHref}>{rootLabel}</Link> / <span>{category.name}</span>
      </nav>
      <h1 className="text-2xl font-bold">{category.name}</h1>
      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <li key={p._id}>
            <Link href={`/coral/${p.slug}?from=${fromCollections ? "collections" : "store"}`} className="card card-compact bg-base-100 shadow hover:shadow-md transition">
              <figure className="bg-base-200 h-48 relative shrink-0 overflow-hidden">
                {p.images?.[0] ? (
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : null}
              </figure>
              <div className="card-body">
                <h2 className="card-title text-lg">{p.name}</h2>
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
    </main>
  );
}
