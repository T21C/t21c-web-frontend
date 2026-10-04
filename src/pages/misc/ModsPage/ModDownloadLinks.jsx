import { useTranslation } from 'react-i18next';
import { ExternalLinkIcon } from '@/components/common/icons';
import { modPlatforms } from './modReleaseDownloads';
import { modDownloadHref } from './modUrls';

export default function ModDownloadLinks({slug, release, latest = false}) {
  const {t} = useTranslation('pages');
  if (!release) return null;
  const platforms = modPlatforms.filter((platform) => release.platformDownloadUrls?.[platform]);
  const links = [
    ...(release.downloadUrl ? [{platform: null, label: t('mods.download')}] : []),
    ...platforms.map((platform) => ({platform, label: t(`mods.releases.platforms.${platform}`)})),
  ];
  return links.map(({platform, label}) => (
    <a key={platform || 'common'} href={modDownloadHref(slug, latest ? undefined : release.version, platform)}
      className="mods-page__download btn-fill-primary">
      <span>{label}</span>
      <ExternalLinkIcon size={16} color="currentColor" />
    </a>
  ));
}
