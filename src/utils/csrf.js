// tuf-search: #csrfToken #csrf #api
/**
 * Cross-origin SPAs cannot read the API host's csrfToken cookie via document.cookie.
 * Keep a memory copy synced from response headers / GET /auth/csrf, and fall back to
 * document.cookie when same-origin (Vite proxy).
 */

let memoryCsrfToken = null;

function readCsrfFromDocumentCookie() {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrfToken='))
    ?.split('=')
    .slice(1)
    .join('=');
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function setCsrfToken(token) {
  if (typeof token === 'string' && token.length > 0) {
    memoryCsrfToken = token;
  }
}

export function clearCsrfToken() {
  memoryCsrfToken = null;
}

export function getCsrfToken() {
  return memoryCsrfToken || readCsrfFromDocumentCookie();
}

export function syncCsrfFromResponse(response) {
  const header =
    response?.headers?.['x-csrf-token'] ||
    response?.headers?.['X-CSRF-Token'];
  if (header) {
    setCsrfToken(header);
    return;
  }
  const bodyToken = response?.data?.csrfToken;
  if (typeof bodyToken === 'string' && bodyToken.length > 0) {
    setCsrfToken(bodyToken);
  }
}
