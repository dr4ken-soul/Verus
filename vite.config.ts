import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for Verus.
// @stellar/stellar-sdk v16 ships as CJS with some ESM sub-paths.
// optimizeDeps.include ensures Vite pre-bundles it correctly and avoids
// "Named export not found" or blank-page errors in the browser.
export default defineConfig({
  plugins: [react()],
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

