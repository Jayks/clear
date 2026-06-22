import type { MetadataRoute } from "next";
import { BRAND, BRAND_TITLE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_TITLE,
    short_name: BRAND.name,
    description: "Group expense splitting for trips and households.",
    id: "/",
    scope: "/",
    start_url: "/groups",
    display: "standalone",
    background_color: "#EFF6FF",
    theme_color: "#0891B2",
    orientation: "portrait",
    icons: [
      {
        src: "/api/pwa-icon?size=192&v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon?size=512&v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon?size=512&v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "My Groups",
        url: "/groups",
        description: "View all your groups",
      },
    ],
  };
}
