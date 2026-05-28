// tuf-search: #vite-env.d
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Per-environment hosts (see .env — active VITE_*_URL vars point at one of these)
  readonly VITE_DEV_API_URL: string;
  readonly VITE_STAGING_API_URL: string;
  readonly VITE_PROD_API_URL: string;
  readonly VITE_OWN_DEV_URL: string;
  readonly VITE_OWN_STAGING_URL: string;
  readonly VITE_OWN_PROD_URL: string;
  readonly VITE_DEV_CDN_URL: string;
  readonly VITE_PROD_CDN_URL: string;

  // Active base URLs for the current build (set in .env / .env.production)
  readonly VITE_API_URL: string;
  readonly VITE_OWN_URL: string;
  readonly VITE_CDN_URL: string;

  // Feature flags & public keys
  readonly VITE_APRIL_FOOLS: string;
  readonly VITE_CUSTOM_PROFILE_BANNERS_ENABLED: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
