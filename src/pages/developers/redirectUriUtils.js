/**
 * Client-side redirect URI checks aligned with server assertValidRedirectUri.
 * @param {string} uri
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateRedirectUri(uri) {
  const trimmed = typeof uri === 'string' ? uri.trim() : '';
  if (!trimmed) return { ok: false, error: 'empty' };
  if (trimmed !== uri) return { ok: false, error: 'whitespace' };
  if (trimmed.length > 1024) return { ok: false, error: 'tooLong' };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'invalid' };
  }

  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  if (['javascript', 'data', 'file', 'vbscript'].includes(scheme)) {
    return { ok: false, error: 'scheme' };
  }
  if (scheme === 'http') {
    const host = parsed.hostname.toLowerCase();
    if (host !== '127.0.0.1' && host !== 'localhost') {
      return { ok: false, error: 'httpLoopback' };
    }
  }
  return { ok: true };
}
