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

export default async function StorePage() {
  let products: ProductsResponse["products"] = [];
  let total = 0;
  let categories: CategoriesResponse["categories"] = [];

  try {
    const [categoriesData, productsData] = await Promise.all([
      fetchApi<CategoriesResponse>("/api/categories"),
      fetchApi<ProductsResponse>(`/api/products?page=1&limit=${DEFAULT_LIMIT}`),
    ]);
    categories = categoriesData.categories ?? [];
    products = productsData.products ?? [];
    total = productsData.total ?? 0;
  } catch {
    // API may be down during build
  }

  return (
    <main className="w-full px-6 pt-6 pb-10">
      <h1 className="text-2xl font-bold mb-2">Store</h1>
      <p className="text-base-content/80 mb-4">Browse our coral collection.</p>
      <StoreView
        products={products}
        categories={categories}
        total={total}
        page={1}
        limit={DEFAULT_LIMIT}
        allowedLimits={ALLOWED_LIMITS}
      />
    </main>
  );
}
