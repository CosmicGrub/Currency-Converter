import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // We register the service worker ourselves in src/main.tsx (guarded on
      // "serviceWorker" in navigator) so App.test.tsx never has to resolve
      // the virtual:pwa-register module -- disable the plugin's own
      // auto-injected register script to avoid a double registration.
      injectRegister: false,
      includeAssets: ["icon.svg"],
      manifest: {
        name: "ExchangeBoard — Global Currency Converter",
        short_name: "ExchangeBoard",
        description:
          "ExchangeBoard — a USD-based global currency converter with live, instant conversion.",
        theme_color: "#0B1220",
        background_color: "#0B1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache every built JS/CSS asset and web font, plus the app shell,
        // so the app boots offline after the first successful visit.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2,ttf}"],
        runtimeCaching: [
          {
            // Live rate table -- open.er-api.com/v6/latest/USD
            urlPattern: ({ url }) => url.hostname === "open.er-api.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "exchangeboard-rates-cache",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Historical time series -- api.frankfurter.dev/v1/...
            urlPattern: ({ url }) => url.hostname === "api.frankfurter.dev",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "exchangeboard-history-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Curated crypto rates -- api.coingecko.com/api/v3/simple/price
            urlPattern: ({ url }) => url.hostname === "api.coingecko.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "exchangeboard-crypto-cache",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Off by default -- enabling the SW under `vite dev` makes iteration
        // confusing (stale precache vs. live HMR). Turn on to test offline
        // behavior locally: `VITE_PWA_DEV=true npm run dev`.
        enabled: process.env.VITE_PWA_DEV === "true",
      },
    }),
  ],
});
