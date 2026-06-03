// tuf-search: #videoLink #getVideoProvider #youtube #bilibili

const VIDEO_HOST_PATTERNS = [
  { host: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, label: 'youtube' },
  { host: /(^|\.)bilibili\.com$|(^|\.)b23\.tv$/i, label: 'bilibili' },
];

/** @returns {'youtube' | 'bilibili' | null} */
export function getVideoProvider(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    for (const row of VIDEO_HOST_PATTERNS) {
      if (row.host.test(host)) return row.label;
    }
    return null;
  } catch {
    return null;
  }
}
