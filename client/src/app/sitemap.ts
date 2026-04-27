import { MetadataRoute } from "next";
import { fetchApi } from "@/lib/api-server";
import { blogPosts } from "@/lib/blog-data";
import type { ProductsResponse, CategoriesResponse, CollectionsResponse } from "@/lib/types";
import { filterDisplayCategories } from "@/lib/types";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/customer-service`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/shipping-returns`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms-of-service`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  // Blog posts — sourced from static data; swap to API call when blog moves to database
  for (const post of blogPosts) {
    entries.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  try {
    const [productsData, categoriesData, collectionsData] = await Promise.all([
      fetchApi<ProductsResponse>("/api/products?limit=500"),
      fetchApi<CategoriesResponse>("/api/categories"),
      fetchApi<CollectionsResponse>("/api/collections"),
    ]);
    for (const p of productsData.products ?? []) {
      entries.push({
        url: `${baseUrl}/coral/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
    for (const c of filterDisplayCategories(categoriesData.categories ?? [])) {
      entries.push({
        url: `${baseUrl}/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const col of collectionsData.collections ?? []) {
      entries.push({
        url: `${baseUrl}/collections/${col.slug}`,
        lastModified: new Date(col.updatedAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // API may be down during build
  }

  return entries;
}
