import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { parseSafeUrl } from '@/utils/bioCanvas/urls';
import { ExternalLink } from '@/components/common/LinkConfirm';
import { ExternalLinkIcon } from '@/components/common/icons';
import { modPlatforms } from './modReleaseDownloads';
import { selectClientModDownloadUrl } from './modUrls';

export function recordModDownload(slug) {
  if (!slug) return;
  api.post(routes.mods.download(slug)).catch(() => {});
}

export default function ModDownloadLinks({ slug, release }) {
  const { t } = useTranslation('pages');
  if (!release) return null;
  const platforms = modPlatforms.filter((platform) => release.platformDownloadUrls?.[platform]);
  const links = [
    ...(release.downloadUrl ? [{ platform: null, label: t('mods.download') }] : []),
    ...platforms.map((platform) => ({ platform, label: t(`mods.releases.platforms.${platform}`) })),
  ].flatMap(({ platform, label }) => {
    const href = parseSafeUrl(selectClientModDownloadUrl(release, platform));
    if (!href) return [];
    return [{ key: platform || 'common', href, label }];
  });
  return links.map(({ key, href, label }) => (
    <ExternalLink
      key={key}
      href={href}
      forceWarning
      className="mods-page__download btn-fill-primary"
      onConfirmed={() => recordModDownload(slug)}
    >
      <span>{label}</span>
      <ExternalLinkIcon size={16} color="currentColor" />
    </ExternalLink>
  ));
}
