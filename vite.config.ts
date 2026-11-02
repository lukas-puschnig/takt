/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Projektseite auf GitHub Pages: user.github.io/takt/. Der Deploy-Workflow setzt BASE_PATH ebenfalls.
const base = process.env.BASE_PATH ?? '/takt/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Takt',
        short_name: 'Takt',
        description: 'Fokus-Blöcke und tägliche Routinen.',
        lang: 'de',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#D61F8C',
        background_color: '#F7F1F5',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectRegister: 'script',
      workbox: {
        cacheId: 'takt-v2',
        cleanupOutdatedCaches: true,
        // Löscht Caches, die nicht zu dieser App gehören (z. B. alte Namen).
        importScripts: ['sw-cleanup.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
