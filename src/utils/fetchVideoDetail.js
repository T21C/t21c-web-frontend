// tuf-search: #fetchVideoDetail #videoDetails #bilibili #douyin
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { getLocalVideoPreview, getVideoProvider } from '@/utils/videoLink';

/**
 * Embed preview plus Bilibili/Douyin title, channel, and upload time.
 * YouTube stays on the local preview so this does not call the YouTube Data API.
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function loadSubmissionVideoDetail(url, { signal } = {}) {
  const local = getLocalVideoPreview(url);
  const provider = getVideoProvider(url);
  if (provider !== 'bilibili' && provider !== 'douyin') return local;

  try {
    const response = await api.get(routes.media.videoDetails(url), { signal });
    const data = response?.data;
    if (!data || typeof data !== 'object') return local;

    const image =
      typeof data.image === 'string' && data.image.trim()
        ? data.image.trim()
        : (local?.image ?? null);

    return {
      embed: data.embed || local?.embed || null,
      image,
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
