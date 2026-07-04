import { defineConfig } from 'astro/config';

import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import AstroPWA from '@vite-pwa/astro';

// This looks for '--base /your-path/' in your build command line arguments.
// If it finds it, it uses it. If not, it falls back to your default '/thilo/'.
const getBaseUrl = () => {
  const baseIndex = process.argv.indexOf('--base');
  if (baseIndex !== -1 && process.argv[baseIndex + 1]) {
    let flagValue = process.argv[baseIndex + 1];
    // Ensure it starts and ends with a slash (e.g., /thilo/)
    if (!flagValue.startsWith('/')) flagValue = '/' + flagValue;
    if (!flagValue.endsWith('/')) flagValue = flagValue + '/';
    return flagValue;
  }
  return '/thilo/'; // Your default fallback
};

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://thilo.scouts.ch',
  base: '/thilo/',
  
  // This satisfies Workbox precaching perfectly across all i18n routes.
  build: {
    format: 'file',
  },
  
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    AstroPWA({
      registerType: 'prompt', 
      injectRegister: 'auto',
      
      workbox: {
        // Precache all build output (HTML, JS, CSS, fonts, assets)
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff,woff2,ttf,json}'],
        cleanupOutdatedCaches: true,
        // Strip all query params from precache lookups so ?q=... doesn't break the search page match
        ignoreURLParametersMatching: [/.*/],
        // Remap the root '/' precache entry to the actual base path so the
        // SW can serve the homepage when navigating to /thilo/ (not just /)
        manifestTransforms: [
          async (entries) => {
            const base = getBaseUrl();
            return {
              manifest: entries.map(e => e.url === '/' ? { ...e, url: base } : e),
              warnings: [],
            };
          },
        ],
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
          // Cache Cloudinary images (section content + icons)
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-image-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache any other remote images by extension (allow trailing query params)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)(?:\?.*)?$/i,
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
      },
      manifest: {
        name: "Thilo - Schweizer Pfadi Büchlein",
        short_name: "Thilo",
        description: "Das digitale Handbuch der Schweizer Pfadibewegung",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#521d3a",
        background_color: "#521d3a",
        lang: "de",
        categories: ["education", "reference"],
        icons: [
          {
            src: "./favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon"
          },
          {
            src: "./logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "./logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      devOptions: {
        enabled: false, 
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
    // 'viewport' prefetches visible links, which also covers touch devices
    // where 'hover' never fires; the site is small enough for this to be cheap
    defaultStrategy: 'viewport'
  },
  i18n: {
    defaultLocale: "de",
    locales: ["de", "fr", "it"],
    routing: {
      prefixDefaultLocale: false
    }
  },
  outDir: "build"
});
