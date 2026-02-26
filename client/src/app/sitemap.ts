import { MetadataRoute } from "next";
import { fetchApi } from "@/lib/api-server";
import type { ProductsResponse } from "@/lib/types";
import type { CategoriesResponse } from "@/lib/types";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  try {
    const [productsData, categoriesData] = await Promise.all([
      fetchApi<ProductsResponse>("/api/products?limit=500"),
      fetchApi<CategoriesResponse>("/api/categories"),
    ]);
    for (const p of productsData.products ?? []) {
      entries.push({
        url: `${baseUrl}/coral/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
    for (const c of categoriesData.categories ?? []) {
      entries.push({
        url: `${baseUrl}/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // API may be down during build
  }

  return entries;
}
