/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_JWT_REFRESH_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 