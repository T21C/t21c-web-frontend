// tuf-search: #fetchVideoDetail #videoDetails #bilibili
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { getLocalVideoPreview, getVideoProvider } from '@/utils/videoLink';

/**
 * Embed preview plus Bilibili title, channel, and upload time.
 * YouTube stays on the local preview so this does not call the YouTube Data API.
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function loadSubmissionVideoDetail(url, { signal } = {}) {
  const local = getLocalVideoPreview(url);
  if (getVideoProvider(url) !== 'bilibili') return local;

  try {
    const response = await api.get(routes.media.videoDetails(url), { signal });
    const data = response?.data;
    if (!data || typeof data !== 'object') return local;

    return {
      embed: data.embed || local?.embed || null,
      image: local?.image ?? null,
      title: typeof data.title === 'string' ? data.title.trim() : '',
      channelName: typeof data.channelName === 'string' ? data.channelName.trim() : '',
      timestamp: data.timestamp || null,
      channelId: data.channelId ?? null,
    };
  } catch (error) {
    if (api.isCancel(error)) throw error;
    return local;
  }
}
