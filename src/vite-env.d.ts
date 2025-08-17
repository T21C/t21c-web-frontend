/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Base URLs
  readonly VITE_DEV_API_URL: string;
  readonly VITE_STAGING_API_URL: string;
  readonly VITE_PROD_API_URL: string;
  readonly VITE_OWN_DEV_URL: string;
  readonly VITE_OWN_STAGING_URL: string;
  readonly VITE_OWN_PROD_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_OWN_URL: string;

  // Authentication Endpoints
  readonly VITE_VERIFY_PASSWORD: string;
  readonly VITE_AUTH_ME: string;

  // Core Endpoints
  readonly VITE_LEVELS: string;
  readonly VITE_PASSES: string;
  readonly VITE_PLAYERS: string;
  readonly VITE_CREATORS: string;
  readonly VITE_TEAMS: string;

  // Rating Related
  readonly VITE_RATING_API: string;
  readonly VITE_SUBMISSION_API: string;
  readonly VITE_RATERS: string;

  // Statistics and Other Endpoints
  readonly VITE_STATISTICS: string;
  readonly VITE_FORM_SUBMIT: string;
  readonly VITE_PROFILE: string;
  readonly VITE_IMAGE: string;
  readonly VITE_BILIBILI_API: string;
  readonly VITE_DIFFICULTIES: string;
  readonly VITE_WEBHOOK: string;
  readonly VITE_BACKUP_API: string;
  readonly VITE_RATERS_API: string;

  // External API Keys
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;

  readonly VITE_APRIL_FOOLS: boolean;

  readonly VITE_CDN_URL: string;

  readonly VITE_CHUNK_UPLOAD_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 