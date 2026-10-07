import { API_BASE } from '@/config/env';
import { extractDouyinAwemeId } from '@/utils/videoLink';

/**
 * Browser URL for a Douyin cover. The image is served by the Douyin cover
 * route, not the YouTube thumbnail helper and not `/video-details`.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function getDouyinCoverUrl(url) {
  const awemeId = extractDouyinAwemeId(url);
  if (!awemeId) return null;
  const path = `/v2/media/douyin-cover?awemeId=${encodeURIComponent(awemeId)}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
