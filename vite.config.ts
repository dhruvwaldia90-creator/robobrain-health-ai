import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  // Only use the GitHub Pages subpath when building for production.
  // In dev, keep base at "/" so the preview server (which loads "/") works.
  base: command === 'build' ? '/robobrain-health-ai/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
}))
