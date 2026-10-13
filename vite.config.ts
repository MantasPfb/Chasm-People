import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Temporary: makes production errors readable in the browser console
    // instead of minified names like "Se"/"lw". Safe to leave on or remove
    // later — it only affects debuggability, not runtime behavior.
    sourcemap: true,
  },
})
