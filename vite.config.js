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
      : env.VITE_DEV_API_URL
  
  const ownUrl = mode === 'production' 
    ? env.VITE_OWN_PROD_URL 
    : mode === 'staging' 
      ? env.VITE_OWN_STAGING_URL 
      : env.VITE_OWN_DEV_URL

  const port = mode === 'production' ? 5000 : 5173

  console.log('apiUrl', apiUrl);
  console.log('port', port);

  return {
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
      sourcemap: mode === 'development',
      minify: mode !== 'development',
      outDir: 'dist',
      assetsDir: 'assets',
      manifest: true,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: true,
      },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          manualChunks: {
            react: ['react', 'react-dom'],
            reactRouter: ['react-router', 'react-router-dom'],
            recharts: ['recharts'],
            i18n: ['i18next', 'react-i18next'],
            popups: [
              'src/components/popups/EditLevelPopup/EditLevelPopup.jsx',
            ],
            admin: [
              'src/pages/admin/AnnouncementPage/AnnouncementPage.jsx',
              'src/pages/admin/RatingPage/RatingPage.jsx'
            ]
          }
        }
      }
    },
    css: {
      devSourcemap: mode === 'development',
    },
    server: {
      host: '127.0.0.1',
      port: port,
      strictPort: true,
      cors: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true
      },
      proxy: {
        '/v2': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, 'to:', options.target + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received response:', proxyRes.statusCode, req.url);
            });
          },
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrite: (path) => path
        },
        '^/passes/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, 'to:', options.target + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received response:', proxyRes.statusCode, req.url);
            });
          },
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrite: (path) => path
        },
        '^/levels/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, 'to:', options.target + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received response:', proxyRes.statusCode, req.url);
            });
          },
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrite: (path) => path
        },
        '^/player/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, 'to:', options.target + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received response:', proxyRes.statusCode, req.url);
            });
          },
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrite: (path) => path
        },
        '/events': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Proxying request:', req.method, req.url, 'to:', options.target + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received response:', proxyRes.statusCode, req.url);
            });
          },
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrite: (path) => path
        }
      }
    },
    preview: {
      port: port,
      strictPort: true,
      proxy: {
        '^/levels/\\d+$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        },
        '^/passes/\\d+$': {
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
