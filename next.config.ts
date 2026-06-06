import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      {
        protocol: "https",
        hostname: "riyfedftffuqzxtcpdde.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Canvas alias — required by exifr (used by receipt scanner) which pulls in
  // canvas as an optional dependency that would crash the Turbopack worker.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  // Turbopack ignores webpack() entirely — needs its own top-level alias
  turbopack: {
    resolveAlias: { canvas: "./empty-canvas-shim.ts" },
  },
};

export default nextConfig;
