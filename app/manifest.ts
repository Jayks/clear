import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clear — Split it. Clear it.",
    short_name: "Clear",
    description: "Group expense splitting for trips and households.",
    start_url: "/groups",
    display: "standalone",
    background_color: "#EFF6FF",
    theme_color: "#0891B2",
    orientation: "portrait",
    icons: [
      {
        src: "/api/pwa-icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/api/pwa-icon?size=512",
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
