import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode floating indicator badge (build status corner widget) has a
  // known internal bug — its drag-tracking throws "Uncaught NotFoundError:
  // Failed to execute 'releasePointerCapture'" when a route navigation or an
  // unrelated click elsewhere on the page desyncs its pointer-capture state.
  // Harmless (dev-only, never ships to production) but a recurring console-
  // error false alarm with no upside here — disabled outright.
  devIndicators: false,
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
