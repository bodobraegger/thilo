import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  output: 'static', // Force static site generation (pre-render at build time)
  integrations: [
    tailwind(), 
    react(),
    AstroPWA({
      mode: 'production',
      base: '/',
      scope: '/',
      includeAssets: ['favicon.ico'],
      registerType: 'autoUpdate',
      manifest: false, // We have manifest.json already
      workbox: {
        navigateFallback: undefined, // Don't precache 404 in dev
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.thilo\.scouts\.ch\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'strapi-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true, // Enable PWA in dev mode for testing
        navigateFallbackAllowlist: [/^\//],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      }
    })
  ],
  i18n: {
    defaultLocale: "de",
    locales: ["de", "fr", "it", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  },
  outDir: "build"
});
