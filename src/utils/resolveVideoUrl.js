import { routes } from '@/api/routes';
import api from '@/utils/api';
import { cleanVideoLinks } from '@/utils/videoLink';

/**
 * Canonicalise user-supplied video URLs to a stable form.
 * Multi-link strings are preserved; each token is cleaned.
 */
export function cleanVideoUrl(url) {
  return cleanVideoLinks(url);
}

/**
 * Resolve opaque b23.tv short links and canonicalise other video URLs.
 * @returns {Promise<{ url: string, resolved: boolean }>}
 */
export async function resolveSubmissionVideoUrl(rawUrl, { signal } = {}) {
  const trimmed = rawUrl?.trim?.() ?? '';
  if (!trimmed) {
    return { url: '', resolved: false };
  }

  const response = await api.get(routes.media.resolveVideoUrl(trimmed), { signal });
  const data = response?.data ?? {};
  return {
    url: typeof data.url === 'string' ? data.url : cleanVideoUrl(trimmed),
    resolved: Boolean(data.resolved),
  };
}
