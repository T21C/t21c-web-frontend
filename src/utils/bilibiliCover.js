import { API_BASE } from '@/config/env';
import { extractBilibiliBvId } from '@/utils/videoLink';

/**
 * Browser URL for a Bilibili cover. The image is served by the Bilibili cover
 * route, not the YouTube thumbnail helper and not `/video-details`.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function getBilibiliCoverUrl(url) {
  const bvid = extractBilibiliBvId(url);
  if (!bvid) return null;
  const path = `/v2/media/bilibili-cover?bvid=${encodeURIComponent(bvid)}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
