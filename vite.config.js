import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import sitemapPlugin from 'vite-plugin-sitemap'

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
      react(),
      sitemapPlugin({
        hostname: ownUrl,
        dynamicRoutes: [
          '/',
          '/about',
          '/contact',
          '/levels',
          '/passes',
          '/leaderboard',
          '/player',
          '/admin/rating'
        ],
      }),
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
          manualChunks: (id) => {
            
            if (id.includes('node_modules/react-select/') || 
              id.includes('node_modules/react-tooltip/') || 
              id.includes('node_modules/recharts/') ||
              id.includes('node_modules/react-hot-toast/')) {
               return 'ui-libs';
            }

            const reactDependencies = [
              'react', 
              'emotion',
              'use'
            ]
            if (reactDependencies.some(dep => id.includes(dep))) {
              return 'react-core';
            }
            

            
            // Data utilities
            if (id.includes('node_modules/axios/') || 
                id.includes('node_modules/js-cookie/') || 
                id.includes('node_modules/date-fns/') ||
                id.includes('node_modules/prop-types/')) {
              return 'data-utils';
            }
            
            // i18n libraries
            if (id.includes('node_modules/i18next/') || 
                id.includes('node_modules/react-i18next/')) {
              return 'i18n';
            }
            
            // UI interaction libraries
            if (id.includes('node_modules/react-infinite-scroll-component/') ||
                id.includes('node_modules/@react-oauth/google/')) {
              return 'ui-interaction';
            }
            
            // App components
            if (id.includes('/src/contexts/')) return 'app-contexts';
            if (id.includes('/src/components/common/')) return 'common-components';
            if (id.includes('/src/components/cards/')) return 'card-components';
            if (id.includes('/src/components/layout/')) return 'layout-components';
            if (id.includes('/src/components/popups/')) return 'popup-components';
            if (id.includes('/src/components/misc/')) return 'misc-components';
            if (id.includes('/src/utils/') && !id.includes('api.js')) return 'utilities';
            
            // Pages
            if (id.includes('/src/pages/common/')) return 'page-common';
            if (id.includes('/src/pages/account/')) return 'page-account';
            if (id.includes('/src/pages/admin/')) return 'page-admin';
            if (id.includes('/src/pages/misc/')) return 'page-misc';
            if (id.includes('/src/pages/submissions/')) return 'page-submissions';
            
            // Create a vendor chunk for remaining node_modules
            if (id.includes('node_modules')) {
              return 'vendor-deps';
            }
            
            // Default case - let Vite decide
            return undefined;
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
