import { API_BASE } from '@/config/env';
import { routes } from '@/api/routes';
import { detectClientModPlatform } from './modReleaseDownloads';

export function modDownloadHref(slug, version, platform = detectClientModPlatform(
  typeof navigator !== 'undefined' ? navigator.userAgentData?.platform || navigator.userAgent : '',
)) {
  const path = version
    ? routes.mods.downloadVersion(slug, version)
    : routes.mods.download(slug);
  return `${API_BASE}${path}${platform ? `?platform=${encodeURIComponent(platform)}` : ''}`;
}

export function modPermalink(slug, version) {
  if (version) return `/mods/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  return `/mods/${encodeURIComponent(slug)}`;
}
