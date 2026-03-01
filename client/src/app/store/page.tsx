import { fetchApi } from "@/lib/api-server";
import type { CategoriesResponse, ProductsResponse } from "@/lib/types";
import { StoreView } from "@/components/store/StoreView";

export const metadata = {
  title: "Store",
  description: "Browse all corals available in our store",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Store",
    description: "Browse all corals available in our store",
  },
  twitter: {
    card: "summary",
    title: "Store",
    description: "Browse all corals available in our store",
  },
};

const ALLOWED_LIMITS = [50, 100, 150] as const;
const DEFAULT_LIMIT = 50;

type StorePageProps = {
  searchParams: Promise<{ page?: string; limit?: string; category?: string; q?: string }>;
};

function buildProductsQuery(params: {
  page: number;
  limit: number;
  categoryId?: string;
  q?: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  if (params.categoryId) search.set("category", params.categoryId);
  if (params.q?.trim()) search.set("q", params.q.trim());
  return search.toString();
}

export default async function StorePage({ searchParams }: StorePageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const requestedLimit = parseInt(params.limit ?? String(DEFAULT_LIMIT), 10);
  const limit = ALLOWED_LIMITS.includes(requestedLimit as (typeof ALLOWED_LIMITS)[number])
    ? requestedLimit
    : DEFAULT_LIMIT;
  const categorySlug = params.category?.trim() || undefined;
  const searchQuery = params.q?.trim() || undefined;

  let products: ProductsResponse["products"] = [];
  let total = 0;
  let categories: CategoriesResponse["categories"] = [];

  try {
    const categoriesData = await fetchApi<CategoriesResponse>("/api/categories");
    categories = categoriesData.categories ?? [];
    const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
    const query = buildProductsQuery({
      page,
      limit,
      categoryId: category?._id,
      q: searchQuery,
    });
    const productsData = await fetchApi<ProductsResponse>(`/api/products?${query}`);
    products = productsData.products ?? [];
    total = productsData.total ?? 0;
  } catch {
    // API may be down
  }

  return (
    <main className="w-full px-6 pt-6 pb-10">
      <h1 className="text-2xl font-bold mb-2">Store</h1>
      <p className="text-base-content/80 mb-4">Browse our coral collection.</p>
      <StoreView
        products={products}
        categories={categories}
        total={total}
        page={page}
        limit={limit}
        allowedLimits={ALLOWED_LIMITS}
        initialCategorySlug={categorySlug}
        initialSearchQuery={searchQuery}
      />
    </main>
  );
}
