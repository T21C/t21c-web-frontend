import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  logLevel: 'info',  
  build: {
    sourcemap: false
  },
  css: {
    devSourcemap: false,
  },
  server: {
    sourcemap: false
  }
})
