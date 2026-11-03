import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { vizDocs } from './scripts/vizDocs.ts'
import { vizStyle } from './scripts/vizStyle.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), vizDocs(), vizStyle()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8100',
    },
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        catalog: 'catalog.html',
        viz: 'viz.html',
        'new-catalog': 'new-catalog.html',
        lab: 'lab.html',
      },

    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
