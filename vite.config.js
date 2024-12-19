import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  logLevel: 'info',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ['react-helmet-async']
  },
  build: {
    sourcemap: false
  },
  css: {
    devSourcemap: false,
  },
  server: {
    sourcemap: false,
    host: '0.0.0.0',
    proxy: {
      // API routes go directly to backend
      '/v2': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        ws: true
      },
      // Only proxy exact pass/level number routes to Express for meta tags
      '^/passes/\\d+$': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      },
      '^/levels/\\d+$': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      },
      '^/player/\\d+$': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      }
    },
    strictPort: true,
    cors: true
  }
})
