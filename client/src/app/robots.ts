import { MetadataRoute } from "next";

export const dynamic = "force-static";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/checkout", "/dashboard"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
