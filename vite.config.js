import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine API URL based on environment
  const apiUrl = mode === 'production' 
    ? env.VITE_PROD_API_URL 
    : mode === 'staging' 
      ? env.VITE_STAGING_API_URL 
      : env.VITE_API_URL

  return {
    plugins: [react()],
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
      sourcemap: mode === 'development',
      minify: mode !== 'development',
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['react-select', 'react-tooltip', 'recharts']
          }
        }
      }
    },
    css: {
      devSourcemap: mode === 'development',
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      cors: true,
      hmr: {
        protocol: 'wss',
        host: 'tufstaging.online',
        clientPort: 443
      },
      watch: {
        usePolling: true
      },
      proxy: {
        '/v2': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: true
        },
        '^/passes/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        },
        '^/levels/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        },
        '^/player/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        }
      }
    }
  }
})
