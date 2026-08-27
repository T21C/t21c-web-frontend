// tuf-search: #superAdminProof
/**
 * HMAC-SHA256 proof of SUPER_ADMIN_KEY, bound to the submitting user and request.
 * Wire format: v1.{unixSeconds}.{hex}
 */

export function normalizeSuperAdminProofPath(path) {
  const raw = String(path || '').split('?')[0];
  if (!raw) return '/';
  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).pathname || '/';
    }
  } catch {
    /* keep raw path */
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function superAdminProofMessage({ userId, username, method, path, unixSeconds }) {
  return [
    'v1',
    userId,
    username,
    String(method || '').toUpperCase(),
    normalizeSuperAdminProofPath(path),
    String(unixSeconds),
  ].join('\n');
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {{
 *   secret: string,
 *   userId: string,
 *   username: string,
 *   method: string,
 *   path: string,
 *   unixSeconds?: number,
 * }} params
 */
export async function createSuperAdminProof(params) {
  const unixSeconds = params.unixSeconds ?? Math.floor(Date.now() / 1000);
  const hex = await hmacSha256Hex(
    params.secret,
    superAdminProofMessage({
      userId: params.userId,
      username: params.username,
      method: params.method,
      path: params.path,
      unixSeconds,
    }),
  );
  return `v1.${unixSeconds}.${hex}`;
}
