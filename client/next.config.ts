import type { NextConfig } from "next";

const API_PORT = process.env.API_PORT || "4004";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${API_PORT}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
