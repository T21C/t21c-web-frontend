import { parseSafeUrl } from '@/utils/bioCanvas/urls';
import { detectClientModPlatform } from './modReleaseDownloads';

/** Stored release URL for this platform, otherwise the common download URL. */
export function selectClientModDownloadUrl(release, platform) {
  if (!release) return '';
  if (platform) {
    const specific = release.platformDownloadUrls?.[platform];
    if (typeof specific === 'string' && specific.trim()) return specific.trim();
  }
  return typeof release.downloadUrl === 'string' ? release.downloadUrl.trim() : '';
}

/** Safe http(s) href for the current device, taken from the mod payload itself. */
export function modDirectDownloadHref(release, platform = detectClientModPlatform(
  typeof navigator !== 'undefined' ? navigator.userAgentData?.platform || navigator.userAgent : '',
)) {
  return parseSafeUrl(selectClientModDownloadUrl(release, platform));
}

export function modPermalink(slug, version) {
  if (version) return `/mods/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  return `/mods/${encodeURIComponent(slug)}`;
}
