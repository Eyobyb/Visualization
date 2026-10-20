import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { vizDocs } from './scripts/vizDocs.ts'

export default defineConfig({
  plugins: [react(), vizDocs()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8100',
    },
  },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', catalog: 'catalog.html' },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
