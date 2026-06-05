// tuf-search: #envConfig
import { envBool } from '@/utils/envBool';

function normalizeOrigin(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

/** API host from env (e.g. https://api.tuforums.com). Path-only routes live in `src/api/routes.ts`. */
export const API_BASE = normalizeOrigin(import.meta.env.VITE_API_URL);
export const OWN_BASE = normalizeOrigin(import.meta.env.VITE_OWN_URL);
export const CDN_BASE = normalizeOrigin(import.meta.env.VITE_CDN_URL);

/** All known site origins (dev/staging/prod) for parsing pasted level links in search. */
export const OWN_URL_BASES = [
  ...new Set(
    [
      import.meta.env.VITE_OWN_URL,
      import.meta.env.VITE_OWN_DEV_URL,
      import.meta.env.VITE_OWN_STAGING_URL,
      import.meta.env.VITE_OWN_PROD_URL,
    ]
      .map(normalizeOrigin)
      .filter(Boolean),
  ),
];

export const APRIL_FOOLS_ENABLED = envBool(import.meta.env.VITE_APRIL_FOOLS, false);
export const CUSTOM_PROFILE_BANNERS_ENABLED = envBool(
  import.meta.env.VITE_CUSTOM_PROFILE_BANNERS_ENABLED,
  true,
);

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

if (import.meta.env.DEV && !API_BASE) {
  // eslint-disable-next-line no-console
  console.error('[env] Missing VITE_API_URL (API_BASE)');
}
