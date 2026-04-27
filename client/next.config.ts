import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve("."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      // Shopify product URLs → coral detail pages
      {
        source: "/products/:slug",
        destination: "/coral/:slug",
        permanent: true,
      },
      // Shopify collection-scoped product URLs (e.g. /collections/featured/products/my-coral)
      {
        source: "/collections/:collection/products/:slug",
        destination: "/coral/:slug",
        permanent: true,
      },
      // Shopify "all products" collection → store
      {
        source: "/collections/all",
        destination: "/store",
        permanent: true,
      },
      // Shopify static pages
      {
        source: "/pages/customer-service",
        destination: "/customer-service",
        permanent: true,
      },
      {
        source: "/pages/privacy-policy",
        destination: "/privacy-policy",
        permanent: true,
      },
      {
        source: "/pages/shipping-and-returns",
        destination: "/shipping-returns",
        permanent: true,
      },
      {
        source: "/pages/terms-of-service",
        destination: "/terms-of-service",
        permanent: true,
      },
      // Shopify blog URLs
      {
        source: "/blogs/news",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/blogs/news/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
