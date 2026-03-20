import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/logic-gate-sim/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
