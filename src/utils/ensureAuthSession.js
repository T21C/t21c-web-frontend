import api from '@/utils/api';
import { routes } from '@/api/routes';

/**
 * Refresh the access-token cookie before a mutation when the access token may have expired
 * (e.g. long bio-canvas editing sessions). Throws if the session cannot be renewed.
 */
export async function ensureAuthSession() {
  await api.post(routes.auth.refresh());
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isNoTokenAuthError(err) {
  const msg = err?.response?.data?.error;
  return err?.response?.status === 401 && typeof msg === 'string' && msg.toLowerCase() === 'no token provided';
}
