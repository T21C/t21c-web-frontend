import { routes } from '@/api/routes';
import api from '@/utils/api';

/**
 * Canonicalise user-supplied video URLs to a stable form.
 * Unknown URLs pass through unchanged.
 */
export function cleanVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';

  const patterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    /https?:\/\/(?:www\.|m\.)?b23\.tv\/(BV[a-zA-Z0-9]+)/,
    /https?:\/\/(?:www\.|m\.)?bilibili\.com\/.*?(BV[a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      if (match[1].startsWith('BV')) {
        return `https://www.bilibili.com/video/${match[1]}`;
      }
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  return url;
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
