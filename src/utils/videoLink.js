// tuf-search: #videoLink #getVideoProvider #youtube #bilibili

const VIDEO_HOST_PATTERNS = [
  { host: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, label: 'youtube' },
  { host: /(^|\.)bilibili\.com$|(^|\.)b23\.tv$/i, label: 'bilibili' },
];

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

/** @returns {'youtube' | 'bilibili' | null} */
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

function cleanSingleVideoUrl(url) {
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

/** Canonicalise each whitespace-separated video URL; preserves multi-link strings. */
export function cleanVideoLinks(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const parts = splitVideoLinks(raw);
  if (parts.length === 0) return '';
  return parts.map(cleanSingleVideoUrl).join(' ');
}
