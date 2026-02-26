import { fetchApi } from "@/lib/api-server";
import type { ProductsResponse, CategoriesResponse } from "@/lib/types";
import { HomeProductGrid } from "@/components/store/HomeProductGrid";

export default async function ShopHomePage() {
  const [productsData, categoriesData] = await Promise.all([
    fetchApi<ProductsResponse>("/api/products?limit=12"),
    fetchApi<CategoriesResponse>("/api/categories"),
  ]);
  const { products, total } = productsData;
  const { categories } = categoriesData;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Coral Store</h1>
      <p className="mt-2 text-base-content/80">Browse our coral catalog.</p>
      <HomeProductGrid products={products} categories={categories} total={total} />
    </main>
  );
}
