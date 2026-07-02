import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Vite configuration for Verus.
// @stellar/stellar-sdk v16 requires Buffer and process in the browser.
// nodePolyfills injects them so the SDK initialises correctly.
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util'],
      globals: { Buffer: true, process: true },
    }),
  ],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['@stellar/stellar-sdk', '@stellar/stellar-sdk/rpc'],
  },
  build: {
    commonjsOptions: {
      include: [/@stellar\/stellar-sdk/, /node_modules/],
    },
  },
})

