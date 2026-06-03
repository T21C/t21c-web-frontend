// tuf-search: #meta
export {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  buildCanonicalUrl,
  resolveMetaImage,
  buildThumbnailUrl,
  resolveOgLocale,
  toSafeArray,
} from './staticMeta';

export {
  normalizeJsonLdBlocks,
  siteJsonLd,
  breadcrumbJsonLd,
  personJsonLd,
  profilePageJsonLd,
  videoObjectJsonLd,
  creativeWorkJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from './jsonLd';

export { resolveRouteDocumentMeta } from './routeMeta';

export {
  buildLevelMeta,
  buildPassMeta,
  buildPackMeta,
  buildCreatorMeta,
  buildPlayerMeta,
  buildSongMeta,
  buildArtistMeta,
  buildListPageMeta,
  buildLeaderboardMeta,
  buildStaticPageMeta,
} from './entityMeta';
