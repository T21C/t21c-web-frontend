export const modPlatforms = ['windows', 'macos', 'linux'];

export function detectClientModPlatform(platform) {
  if (/android|iphone|ipad|ipod|windows phone/i.test(platform || '')) return undefined;
  if (/win/i.test(platform || '')) return 'windows';
  if (/mac/i.test(platform || '')) return 'macos';
  if (/linux/i.test(platform || '')) return 'linux';
  return undefined;
}

export function isZipUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && /\.zip$/i.test(url.pathname);
  } catch { return false; }
}

export function buildModReleaseBody({ version, notes, releasedAt, githubUrl, downloadUrl, platformDownloadUrls, file }) {
  if (file) {
    const body = new FormData();
    body.append('version', version);
    if (notes !== undefined) body.append('notes', notes || '');
    if (releasedAt) body.append('releasedAt', releasedAt);
    body.append('file', file);
    return body;
  }
  const body = { version };
  if (notes !== undefined) body.notes = notes || null;
  if (releasedAt) body.releasedAt = releasedAt;
  if (githubUrl !== undefined) body.githubUrl = githubUrl || null;
  if (downloadUrl !== undefined) body.downloadUrl = downloadUrl;
  if (platformDownloadUrls !== undefined) body.platformDownloadUrls = platformDownloadUrls;
  return body;
}

export function releaseDownloadFields(form) {
  const platformDownloadUrls = form.downloadMode === 'platforms'
    ? Object.fromEntries(modPlatforms.flatMap((platform) => {
        const url = form.platformDownloadUrls[platform]?.trim();
        return url ? [[platform, url]] : [];
      })) : {};
  const downloadUrl = form.downloadUrl.trim();
  // GitHub-only legacy releases can be resolved server-side on save.
  if (!downloadUrl && !Object.keys(platformDownloadUrls).length && form.githubUrl.trim()) {
    return {githubUrl: form.githubUrl.trim()};
  }
  return {githubUrl: form.githubUrl.trim(), downloadUrl,
    platformDownloadUrls: Object.keys(platformDownloadUrls).length ? platformDownloadUrls : null};
}
