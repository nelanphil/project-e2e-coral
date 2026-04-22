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

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawLimit = Number(params.limit ?? DEFAULT_LIMIT);
  const limit = (ALLOWED_LIMITS as readonly number[]).includes(rawLimit)
    ? rawLimit
    : DEFAULT_LIMIT;
  const page = Math.max(1, Number(params.page ?? 1));
  const category =
    typeof params.category === "string" ? params.category : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;

  let products: ProductsResponse["products"] = [];
  let total = 0;
  let categories: CategoriesResponse["categories"] = [];

  const productQuery = new URLSearchParams();
  productQuery.set("page", String(page));
  productQuery.set("limit", String(limit));
  if (category) productQuery.set("category", category);
  if (q) productQuery.set("q", q);

  try {
    const [categoriesData, productsData] = await Promise.all([
      fetchApi<CategoriesResponse>("/api/categories"),
      // Bypass data cache for search queries so results always reflect current stock/visibility
      fetchApi<ProductsResponse>(
        `/api/products?${productQuery}`,
        q ? { cache: "no-store" } : undefined,
      ),
    ]);
    categories = categoriesData.categories ?? [];
    products = productsData.products ?? [];
    total = productsData.total ?? 0;
  } catch {
    // API may be down during build
  }

  return (
    <main className="w-full px-6 pt-6 pb-10">
      <StoreView
        products={products}
        categories={categories}
        total={total}
        page={page}
        limit={limit}
        allowedLimits={ALLOWED_LIMITS}
        initialCategorySlug={category ?? null}
        initialSearchQuery={q ?? null}
      />
    </main>
  );
}
