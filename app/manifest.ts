import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Black Bull Studio",
    short_name: "Black Bull",
    description: "AI creative studio and Solana trading terminal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f2",
    theme_color: "#f7f5f2",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New post", url: "/create-post" },
      { name: "Messages", url: "/chat" },
      { name: "Notifications", url: "/notifications" },
    ],
  };
}
