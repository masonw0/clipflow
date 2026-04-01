import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "ClipFlow",
        short_name: "ClipFlow",
        description: "Clip review platform for content creators",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache the app shell and all static assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Network-first for navigation so fresh deploys are always picked up
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            // Supabase API / storage — network-first, fall back to cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Google Fonts and other CDN assets
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      // Flip devOptions.enabled to true to test the SW in dev mode
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
});
