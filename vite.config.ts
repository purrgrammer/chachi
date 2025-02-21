import path from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";

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
    }),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
