import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Where /api is proxied in `npm run dev` and `npm run preview`.
// Default: the API from docker compose. Demo: API_PROXY_TARGET=http://localhost:8001
const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable app + offline support. The service worker is src/sw.js.
    // https://vite-pwa-org.netlify.app/
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/main.jsx
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'mizan-icon.svg'],
      manifest: {
        name: 'ميزان — Mizan',
        short_name: 'ميزان',
        description: 'تتبع الدخل والمصروفات',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/log',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#141413',
        background_color: '#f3f0ee',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the home-screen icon -> "Add expense" opens quick add.
        shortcuts: [
          {
            name: 'إضافة مصروف',
            short_name: 'إضافة',
            url: '/log?quick=1',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico}',
          // Only the Latin and Arabic font files; other subsets load on demand.
          '**/*-{latin,latin-ext,arabic}-*.woff2',
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
