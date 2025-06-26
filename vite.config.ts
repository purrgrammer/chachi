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
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Nostr libraries
          'nostr-core': [
            '@nostr-dev-kit/ndk',
            '@nostr-dev-kit/ndk-cache-dexie', 
            '@nostr-dev-kit/ndk-wallet',
            'nostr-tools'
          ],
          // UI component libraries  
          'ui-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog', 
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ],
          // Animation and motion
          'animation': [
            'framer-motion'
          ],
          // Payment and wallet libraries
          'payments': [
            '@cashu/cashu-ts',
            'bitcoinjs-lib',
            'light-bolt11-decoder',
            'lnurl-pay'
          ],
          // Media and player libraries
          'media': [
            'react-player',
            'react-awesome-slider',
            'pigeon-maps'
          ],
          // Form and data handling
          'forms-data': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'dexie',
            'dexie-react-hooks',
            '@radix-ui/react-slot',
            '@radix-ui/react-label'
          ],
          // Text processing and rendering
          'text-processing': [
            'react-markdown',
            'remark-gfm',
            'prismjs',
            'prism-react-renderer',
            'asciidoctor',
            '@oxide/react-asciidoc'
          ],
          // Utilities and smaller libs
          'utils': [
            'lodash.debounce',
            'date-fns',
            'nanoid',
            'clsx',
            'class-variance-authority',
            'tailwind-merge'
          ]
        }
      }
    },
    // Increase chunk size warning limit since we're intentionally chunking
    chunkSizeWarningLimit: 800,
    // Enable source maps for better debugging
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
