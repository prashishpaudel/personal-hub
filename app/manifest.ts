import type { MetadataRoute } from "next";

// PWA manifest — makes the installed app (Add to Home Screen) feel native:
// proper name, standalone window, hearth theming, hub icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Hub",
    short_name: "Hub",
    description:
      "One space for everything — notes, garden, feeds, media, and links.",
    // id pins the app's identity: without it the identity is derived from
    // start_url, so changing start_url later would register as a new install.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#f7f4ef",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
