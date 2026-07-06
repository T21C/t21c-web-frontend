// tuf-search: #routeMeta #meta
import { matchPath } from 'react-router-dom';
import { buildStaticPageMeta } from './entityMeta';

/**
 * Static route → i18n meta keys. First match wins; put specific paths before prefixes.
 * @type {Array<{ path: string, titleKey: string, descriptionKey?: string, descriptionParams?: object, noindex?: boolean }>}
 */
const ROUTE_DOCUMENT_META = [
  { path: '/', titleKey: 'home.meta.title', descriptionKey: 'home.meta.description' },
  { path: '/levels/:id', titleKey: 'levelDetail.meta.fallbackName', descriptionKey: 'level.meta.description' },
  { path: '/levels', titleKey: 'level.meta.title', descriptionKey: 'level.meta.description' },
  { path: '/passes/:id', titleKey: 'pass.meta.title', descriptionKey: 'pass.meta.description' },
  { path: '/passes', titleKey: 'pass.meta.title', descriptionKey: 'pass.meta.description' },
  { path: '/packs/:id', titleKey: 'pack.meta.title', descriptionKey: 'pack.meta.description' },
  { path: '/packs', titleKey: 'pack.meta.title', descriptionKey: 'pack.meta.description' },
  {
    path: '/profile/:playerId',
    titleKey: 'profile.meta.defaultTitle',
    descriptionKey: 'profile.meta.description',
    descriptionParams: { name: '' },
  },
  {
    path: '/profile',
    titleKey: 'profile.meta.defaultTitle',
    descriptionKey: 'profile.meta.description',
    descriptionParams: { name: '' },
  },
  { path: '/creator/:creatorId', titleKey: 'creators.meta.title', descriptionKey: 'creators.meta.description' },
  { path: '/creator', titleKey: 'creators.meta.title', descriptionKey: 'creators.meta.description' },
  { path: '/creators', titleKey: 'creators.meta.title', descriptionKey: 'creators.meta.description' },
  { path: '/leaderboard', titleKey: 'leaderboard.meta.title', descriptionKey: 'leaderboard.meta.description' },
  { path: '/artists/:id', titleKey: 'artistList.meta.title', descriptionKey: 'artistDetail.meta.description', descriptionParams: { name: '' } },
  { path: '/artists', titleKey: 'artistList.meta.title', descriptionKey: 'artistList.meta.description' },
  { path: '/songs/:id', titleKey: 'songList.meta.title', descriptionKey: 'songDetail.meta.description', descriptionParams: { name: '' } },
  { path: '/songs', titleKey: 'songList.meta.title', descriptionKey: 'songList.meta.description' },
  { path: '/about', titleKey: 'about.meta.title', descriptionKey: 'about.meta.description' },
  { path: '/privacy-policy', titleKey: 'about.meta.title', descriptionKey: 'about.meta.description' },
  { path: '/terms-of-service', titleKey: 'about.meta.title', descriptionKey: 'about.meta.description' },
  { path: '/asset-list', titleKey: 'assets.meta.title', descriptionKey: 'assets.meta.description' },
  { path: '/health', titleKey: 'healthCheck.title', descriptionKey: 'healthCheck.metaDescription', noindex: true },
  { path: '/rating', titleKey: 'rating.meta.title', descriptionKey: 'rating.meta.description' },
  { path: '/login', titleKey: 'login.meta.title', descriptionKey: 'login.meta.description', noindex: true },
  { path: '/register', titleKey: 'login.meta.title', descriptionKey: 'login.meta.description', noindex: true },
  { path: '/forgot-password', titleKey: 'forgotPassword.meta.title', descriptionKey: 'login.meta.description', noindex: true },
  { path: '/submission/level', titleKey: 'submission.meta.title', descriptionKey: 'submission.meta.description', noindex: true },
  { path: '/submission/pass', titleKey: 'submission.meta.title', descriptionKey: 'submission.meta.description', noindex: true },
  { path: '/submission', titleKey: 'submission.meta.title', descriptionKey: 'submission.meta.description', noindex: true },
  { path: '/admin/submissions', titleKey: 'submissionManagement.meta.title', descriptionKey: 'submissionManagement.meta.description', noindex: true },
  { path: '/admin/announcements', titleKey: 'announcement.meta.title', descriptionKey: 'announcement.meta.description', noindex: true },
  { path: '/admin/backups', titleKey: 'backup.meta.title', descriptionKey: 'backup.meta.description', noindex: true },
  { path: '/admin/backup', titleKey: 'backup.meta.title', descriptionKey: 'backup.meta.description', noindex: true },
  { path: '/admin/difficulties', titleKey: 'difficulty.meta.title', descriptionKey: 'difficulty.meta.description', noindex: true },
  { path: '/admin/creators', titleKey: 'creatorManagement.meta.title', descriptionKey: 'creatorManagement.meta.description', noindex: true },
  { path: '/admin/tournaments', titleKey: 'tournamentManagement.meta.title', descriptionKey: 'tournamentManagement.meta.description', noindex: true },

  { path: '/admin/artists', titleKey: 'artistManagement.meta.title', descriptionKey: 'artistManagement.meta.description', noindex: true },
  { path: '/admin/songs', titleKey: 'songManagement.meta.title', descriptionKey: 'songManagement.meta.description', noindex: true },
  { path: '/admin/audit-log', titleKey: 'admin.meta.title', descriptionKey: 'admin.meta.description', noindex: true },
  { path: '/admin/curations/preview/:levelId', titleKey: 'curationCssPreview.meta.title', descriptionKey: 'curationPreview.meta.description', noindex: true },
  { path: '/admin/curations/preview', titleKey: 'curationPreview.meta.title', descriptionKey: 'curationPreview.meta.description', noindex: true },
  { path: '/admin/curations/schedules', titleKey: 'curationSchedule.meta.title', descriptionKey: 'curationSchedule.meta.description', noindex: true },
  { path: '/admin/curations', titleKey: 'curation.meta.title', descriptionKey: 'curation.meta.description', noindex: true },
  { path: '/admin', titleKey: 'admin.meta.title', descriptionKey: 'admin.meta.description', noindex: true },
];

/**
 * Resolve immediate document meta for a pathname (sync, no API data).
 * @param {string} pathname
 * @param {(key: string, opts?: object) => string} t
 */
export const resolveRouteDocumentMeta = (pathname, t) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  for (const route of ROUTE_DOCUMENT_META) {
    if (!matchPath({ path: route.path, end: true }, normalizedPath)) {
      continue;
    }

    const title = t(route.titleKey);
    const description = route.descriptionKey
      ? t(route.descriptionKey, route.descriptionParams || {})
      : undefined;

    return buildStaticPageMeta({
      title,
      description,
      pathname: normalizedPath,
      noindex: Boolean(route.noindex),
    });
  }

  return buildStaticPageMeta({
    title: '',
    pathname: normalizedPath,
  });
};
