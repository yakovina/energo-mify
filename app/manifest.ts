import type { MetadataRoute } from "next";
import { asset } from "./bp";

export const dynamic = "force-static";

// Іконка «на головний екран» для Android і назва застосунку.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Міфи про енергетику · Тест Хмарочоса",
    short_name: "Міфи про енергетику",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    background_color: "#d7ddf2",
    theme_color: "#d7ddf2",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
