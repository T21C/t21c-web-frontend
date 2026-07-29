import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import fs from 'node:fs/promises'

async function findJsonFiles(root, current = root) {
  const entries = await fs.readdir(current, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(current, entry.name)
    if (entry.isDirectory()) return findJsonFiles(root, absolutePath)
    if (!entry.isFile() || !entry.name.endsWith('.json')) return []
    return [path.relative(root, absolutePath).split(path.sep).join('/')]
  }))
  return files.flat().sort()
}

function translationAssetsPlugin() {
  const languagesRoot = path.resolve(__dirname, 'src/translations/languages')

  return {
    name: 'tuf-translation-assets',
    apply: 'build',
    async buildStart() {
      const files = await findJsonFiles(languagesRoot)
      for (const relativePath of files) {
        this.emitFile({
          type: 'asset',
          fileName: `translations/languages/${relativePath}`,
          source: await fs.readFile(path.join(languagesRoot, relativePath)),
        })
      }
      this.emitFile({
        type: 'asset',
        fileName: 'translations/manifest.json',
        source: JSON.stringify({
          version: 1,
          files: files.map((file) => `languages/${file}`),
        }),
      })
    },
  }
}

/** First-party stamp for thirdPartyErrorFilterIntegration — keep in sync with useSentry.js */
const SENTRY_APPLICATION_KEY = 'tuf-website'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  const getEnv = (key) => env[key] || process.env[key]

  const modeApiUrlEnvKey = mode === 'production'
    ? 'VITE_PROD_API_URL'
    : mode === 'staging'
      ? 'VITE_STAGING_API_URL'
      : 'VITE_DEV_API_URL'

  const requiredEnvKeys = [modeApiUrlEnvKey]

  const missingEnvKeys = requiredEnvKeys.filter((key) => !getEnv(key))
  if (missingEnvKeys.length > 0) {
    console.warn(
      `[vite] Missing env vars for ${mode}: ${missingEnvKeys.join(', ')}. ` +
      'API-backed pages may fail until your .env is configured.'
    )
  }

  // Determine API URL based on environment
  const apiUrl = mode === 'production' 
    ? getEnv('VITE_PROD_API_URL')
    : mode === 'staging' 
      ? getEnv('VITE_STAGING_API_URL')
      : getEnv('VITE_DEV_API_URL')
  
  const ownUrl = mode === 'production' 
    ? getEnv('VITE_OWN_PROD_URL')
    : mode === 'staging' 
      ? getEnv('VITE_OWN_STAGING_URL')
      : getEnv('VITE_OWN_DEV_URL')

  const port = mode === 'production' ? 5000 : 5173

  /*
   * Sentry build secrets (NOT VITE_* — must not enter the browser bundle):
   *   SENTRY_AUTH_TOKEN  — org token with Project:Read/Write + Release:Admin
   *   SENTRY_ORG         — default the-universal-forums
   *   SENTRY_PROJECT     — default javascript-react
   *   SENTRY_URL         — default https://de.sentry.io (EU)
   *   SENTRY_RELEASE     — optional; else GITHUB_SHA / git auto-detect
   * Put these in the Docker frontend_env → .env.production secret, or
   * .env.sentry-build-plugin (gitignored). Without SENTRY_AUTH_TOKEN the
   * plugin still stamps applicationKey; sourcemap upload is skipped.
   */
  const sentryAuthToken = getEnv('SENTRY_AUTH_TOKEN')
  const hasSentryUpload = Boolean(sentryAuthToken)
  const sentryRelease =
    getEnv('SENTRY_RELEASE') || getEnv('GITHUB_SHA') || ''

  // Hidden maps only when we can upload+delete them; otherwise don't ship .map files.
  const buildSourcemap =
    mode === 'development' ? true : hasSentryUpload ? 'hidden' : false

  console.log('apiUrl', apiUrl);
  console.log('port', port);
  if (command === 'build') {
    console.log(
      `[sentry] applicationKey=${SENTRY_APPLICATION_KEY}; upload=${hasSentryUpload ? 'on' : 'off (stamp only)'}`,
    )
  }

  return {
    plugins: [
      react(),
      translationAssetsPlugin(),
      // Must be last so maps/instrumentation survive other plugins.
      sentryVitePlugin({
        applicationKey: SENTRY_APPLICATION_KEY,
        org: getEnv('SENTRY_ORG') || 'the-universal-forums',
        project: getEnv('SENTRY_PROJECT') || 'javascript-react',
        // EU ingest (matches VITE_SENTRY_DSN host).
        url: getEnv('SENTRY_URL') || 'https://de.sentry.io',
        authToken: sentryAuthToken || undefined,
        telemetry: false,
        errorHandler: (err) => {
          // Never fail the app build solely because Sentry upload flaked.
          console.warn('[sentry-vite-plugin]', err?.message || err)
        },
        sourcemaps: hasSentryUpload
          ? {
              // Vite writes to BUILD_OUT_DIR=dist.tmp before swap-dist.mjs.
              assets: ['./dist.tmp/**', './dist/**'],
              filesToDeleteAfterUpload: [
                './dist.tmp/**/*.map',
                './dist/**/*.map',
              ],
            }
          : {
              disable: true,
            },
        release: {
          ...(sentryRelease ? { name: sentryRelease } : {}),
          inject: true,
          create: hasSentryUpload,
          finalize: hasSentryUpload,
          setCommits: hasSentryUpload
            ? { auto: true, ignoreMissing: true }
            : false,
        },
      }),
    ],
    define: {
      'process.env.DRAGGABLE_DEBUG': JSON.stringify(''),
      // Align SDK release with uploaded artifacts when set at build time.
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
    },
    logLevel: 'info',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    optimizeDeps: {
      include: ['react-helmet-async', 'hash-wasm', 'react-rnd', 'react-draggable'],
      esbuildOptions: {
        define: {
          'process.env.DRAGGABLE_DEBUG': JSON.stringify(''),
        },
      },
    },
    build: {
      sourcemap: buildSourcemap,
      minify: mode !== 'development',
      outDir: process.env.BUILD_OUT_DIR || 'dist.tmp',
      emptyOutDir: true,
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
        '^/v[23]': {
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
        '^/(levels|passes|profile)/\\d+$|^/packs/[0-9A-Za-z]{8,}$': {
          target: apiUrl || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        },
      }
    }
  }
})
