import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://thilo.scouts.ch',
  integrations: [
    tailwind(),
    react(),
    AstroPWA({
      registerType: 'prompt', // Prompt user before activating new SW
      workbox: {
        // Precache all build output (HTML, JS, CSS, fonts, assets)
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff,woff2,ttf,json}'],
        // Cache Strapi API responses (sections, start-page) for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.thilo\.scouts\.ch\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'strapi-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache remote section icons/images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Serve the root offline fallback for uncached navigations
        navigateFallback: '/404',
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: false, // We manage manifest.json ourselves in /public
      devOptions: {
        enabled: false, // Don't run SW in dev mode
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  i18n: {
    defaultLocale: "de",
    locales: ["de", "fr", "it", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  },
  outDir: "build"
});
