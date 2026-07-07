import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      workbox: {
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") ||
              url.hostname === "script.google.com",
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Programación Agrícola",
        short_name: "Prog. Agrícola",
        description: "Planificación y seguimiento de operaciones de campo - Oleocaribe",
        theme_color: "#1A4D2E",
        background_color: "#F7F5F0",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
