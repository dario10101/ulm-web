import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Fijo: la redirect URI registrada en Google apunta a este puerto. Si
    // estuviera ocupado, Vite tomaria otro en silencio y el login fallaria.
    port: 5173,
    strictPort: true,
    // El navegador le habla solo a localhost:5173; /api se reenvia al backend.
    // Mismo origen para el navegador: la cookie de sesion viaja sola y no hay
    // CORS. 127.0.0.1 y no localhost: Node resuelve localhost primero a IPv6
    // (::1) y uvicorn escucha en IPv4. Esto es solo servidor a servidor, no
    // afecta a cookies ni a Google.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000' },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
