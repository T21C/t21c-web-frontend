// tuf-search: #videoLink #getVideoProvider #youtube #bilibili #douyin

const VIDEO_HOST_PATTERNS = [
  { host: /(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|(^|\.)youtu\.be$/i, label: 'youtube' },
  { host: /(^|\.)bilibili\.com$|(^|\.)b23\.tv$/i, label: 'bilibili' },
  { host: /(^|\.)douyin\.com$|(^|\.)iesdouyin\.com$/i, label: 'douyin' },
];

export const DOUYIN_AWEME_ID_PATTERN = /^\d{15,22}$/;

/** @param {string | null | undefined} raw */
export function splitVideoLinks(raw) {
  if (raw == null || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/).filter(Boolean);
}

/** @param {string | null | undefined} raw */
export function getPrimaryVideoLink(raw) {
  return splitVideoLinks(raw)[0] ?? '';
}

/** @returns {'youtube' | 'bilibili' | 'douyin' | null} */
export function getVideoProvider(url) {
  const primary = getPrimaryVideoLink(url);
  if (!primary) return null;
  try {
    const host = new URL(primary).hostname.replace(/^www\./i, '');
    for (const row of VIDEO_HOST_PATTERNS) {
      if (row.host.test(host)) return row.label;
    }
    return null;
  } catch {
    return null;
  }
}

const YOUTUBE_ID_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /[?&]v=([a-zA-Z0-9_-]{11})/,
];

/** Extract an 11-character YouTube video id from common watch/short/embed URLs. */
export function extractYouTubeVideoId(url) {
  const primary = getPrimaryVideoLink(url);
  if (!primary || getVideoProvider(primary) !== 'youtube') return null;
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = primary.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Build a YouTube iframe embed URL without hitting the video details API. */
export function getYouTubeEmbedUrl(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  const primary = getPrimaryVideoLink(url);
  const timestampMatch = primary.match(/[?&]t=(\d+)s?/);
  const timestamp = timestampMatch?.[1] ?? null;
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  if (timestamp) {
    embedUrl += `?start=${timestamp}`;
  }
  return embedUrl;
}

/** Thumbnail for YouTube links without API calls. */
export function getYouTubeThumbnailUrl(url) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

/** Extract a Bilibili BV id from a video or b23 URL. */
export function extractBilibiliBvId(url) {
  const primary = getPrimaryVideoLink(url);
  if (!primary || getVideoProvider(primary) !== 'bilibili') return null;
  const match = primary.match(/\/(BV[a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

/** Build a Bilibili iframe embed URL from BV id only (no cid / API). */
export function getBilibiliEmbedUrl(url) {
  const bvid = extractBilibiliBvId(url);
  if (!bvid) return null;
  return `https://player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&p=1&autoplay=0`;
}

/** @param {string | null | undefined} value */
function isDouyinAwemeId(value) {
  return typeof value === 'string' && DOUYIN_AWEME_ID_PATTERN.test(value);
}

/** Extract a Douyin aweme id from video, share, player, or query-param URLs. */
export function extractDouyinAwemeId(url) {
  const primary = getPrimaryVideoLink(url);
  if (!primary || getVideoProvider(primary) !== 'douyin') return null;
  try {
    const parsed = new URL(primary);
    const fromPath = parsed.pathname.match(/\/(?:share\/(?:video|note)|video)\/(\d{15,22})/)?.[1];
    if (isDouyinAwemeId(fromPath)) return fromPath;
    for (const key of ['modal_id', 'vid']) {
      const value = parsed.searchParams.get(key);
      if (isDouyinAwemeId(value)) return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function getDouyinCanonicalUrl(url) {
  const awemeId = extractDouyinAwemeId(url);
  return awemeId ? `https://www.douyin.com/video/${awemeId}` : null;
}

/**
 * Build a Douyin iframe embed URL from aweme id only (no metadata API).
 * `mode=pc` is required: the official player mounts `container-mobile` (324×672)
 * whenever the iframe viewport is under 730px, even in a landscape box.
 */
export function getDouyinEmbedUrl(url) {
  const awemeId = extractDouyinAwemeId(url);
  if (!awemeId) return null;
  return `https://open.douyin.com/player/video?vid=${awemeId}&autoplay=0&mode=pc`;
}

/** Douyin official player requires unsafe-url; YouTube and Bilibili stay strict. */
export function getVideoIframeReferrerPolicy(url) {
  return getVideoProvider(url) === 'douyin' ? 'unsafe-url' : 'strict-origin-when-cross-origin';
}

/**
 * Douyin's PC player is 16:9 video plus a bottom control bar, so the wrapper
 * uses 16:10. YouTube and Bilibili stay on the default 16:9 box.
 */
export function getVideoEmbedModifierClass(url) {
  return getVideoProvider(url) === 'douyin' ? 'video-embed--douyin' : '';
}

/** Hide Douyin iframe document scrollbars; YouTube and Bilibili omit this. */
export function getVideoIframeScrolling(url) {
  return getVideoProvider(url) === 'douyin' ? 'no' : undefined;
}

/**
 * Quota-free embed preview.
 * YouTube `image` is img.youtube.com. Bilibili and Douyin `image` stay null here;
 * covers are served by the dedicated cover helpers and never share this helper.
 * @returns {{ embed: string, image: string | null } | null}
 */
export function getLocalVideoPreview(url) {
  if (getVideoProvider(url) === 'youtube') {
    const embed = getYouTubeEmbedUrl(url);
    if (!embed) return null;
    return { embed, image: getYouTubeThumbnailUrl(url) };
  }
  if (getVideoProvider(url) === 'bilibili') {
    const embed = getBilibiliEmbedUrl(url);
    if (!embed) return null;
    return { embed, image: null };
  }
  if (getVideoProvider(url) === 'douyin') {
    const embed = getDouyinEmbedUrl(url);
    if (!embed) return null;
    return { embed, image: null };
  }
  return null;
}

function cleanSingleVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';

  const patterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
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

  const douyinCanonical = getDouyinCanonicalUrl(url);
  if (douyinCanonical) return douyinCanonical;

  return url;
}

/** Canonicalise each whitespace-separated video URL; preserves multi-link strings. */
export function cleanVideoLinks(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const parts = splitVideoLinks(raw);
  if (parts.length === 0) return '';
  return parts.map(cleanSingleVideoUrl).join(' ');
}
