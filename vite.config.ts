import path from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
	  nodePolyfills({ include: ['stream'] }),
	  react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "chachi",
        short_name: "chachi",
        description: "a mobile-friendly nostr group chat client",
        theme_color: "#7c3aed",
        icons: [
          {
            src: "favicon.png",
            sizes: "192x192",
            type: "image/png",
          }
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3*1024*1024
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Enable source maps for better debugging
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'nostr-vendor': ['@nostr-dev-kit/ndk', '@nostr-dev-kit/ndk-cache-dexie', '@nostr-dev-kit/ndk-wallet', 'nostr-tools'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch'
          ],
          'media-vendor': ['react-player', 'framer-motion', 'react-awesome-slider'],
          'crypto-vendor': ['@cashu/cashu-ts', 'bitcoinjs-lib', 'light-bolt11-decoder', 'lnurl-pay'],
          'utils-vendor': ['date-fns', 'lodash.debounce', 'nanoid', 'zod', 'clsx', 'tailwind-merge'],
          'state-vendor': ['jotai', '@tanstack/react-query', 'dexie', 'dexie-react-hooks'],
          'i18n-vendor': ['i18next', 'react-i18next']
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
