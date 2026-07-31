import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import { existsSync } from 'node:fs'
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
   * Sentry build (NOT VITE_*): SENTRY_AUTH_TOKEN (+ org/project/url),
   * SENTRY_RELEASE/GITHUB_SHA. Prod deploy merges discrete GH secrets into
   * .env.production and sets SENTRY_REQUIRE_UPLOAD=1.
   */
  const sentryAuthToken = getEnv('SENTRY_AUTH_TOKEN')
  const hasSentryUpload = Boolean(sentryAuthToken)
  const requireSentryUpload = ['1', 'true', 'yes'].includes(
    String(getEnv('SENTRY_REQUIRE_UPLOAD') || '').toLowerCase(),
  )
  const sentryRelease =
    getEnv('SENTRY_RELEASE') || getEnv('GITHUB_SHA') || ''
  // Prefer token-embedded host when unset; a wrong region (e.g. de vs us) breaks upload.
  const sentryUrl = getEnv('SENTRY_URL') || undefined

  if (command === 'build' && requireSentryUpload && !hasSentryUpload) {
    throw new Error(
      '[sentry] SENTRY_REQUIRE_UPLOAD is set but SENTRY_AUTH_TOKEN is missing (upload=off)',
    )
  }
  if (command === 'build' && requireSentryUpload && !sentryRelease) {
    throw new Error(
      '[sentry] SENTRY_REQUIRE_UPLOAD is set but SENTRY_RELEASE/GITHUB_SHA is missing',
    )
  }

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
      sentryVitePlugin({
        applicationKey: SENTRY_APPLICATION_KEY,
        org: getEnv('SENTRY_ORG') || 'the-universal-forums',
        project: getEnv('SENTRY_PROJECT') || 'javascript-react',
        ...(sentryUrl ? { url: sentryUrl } : {}),
        authToken: sentryAuthToken || undefined,
        telemetry: false,
        errorHandler: (err) => {
          const message = err?.message || String(err)
          if (requireSentryUpload) {
            throw new Error(`[sentry-vite-plugin] ${message}`)
          }
          console.warn('[sentry-vite-plugin]', message)
        },
        sourcemaps: hasSentryUpload
          ? {
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
          setCommits:
            hasSentryUpload && existsSync('.git')
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
