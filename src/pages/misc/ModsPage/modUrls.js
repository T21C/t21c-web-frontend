import { API_BASE } from '@/config/env';
import { routes } from '@/api/routes';

export function modDownloadHref(slug, version) {
  const path = version
    ? routes.mods.downloadVersion(slug, version)
    : routes.mods.download(slug);
  return `${API_BASE}${path}`;
}

export function modPermalink(slug, version) {
  if (version) return `/mods/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  return `/mods/${encodeURIComponent(slug)}`;
}
