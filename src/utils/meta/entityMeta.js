// tuf-search: #entityMeta #meta
import { formatCreatorDisplay } from '@/utils/Utility';
import { getArtistDisplayName, getSongDisplayName } from '@/utils/levelHelpers';
import {
  buildCanonicalUrl,
  buildStaticPageMeta,
  buildThumbnailUrl,
  resolveMetaImage,
  toSafeArray,
} from './staticMeta';
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  creativeWorkJsonLd,
  itemListJsonLd,
  profilePageJsonLd,
  videoObjectJsonLd,
} from './jsonLd';

const joinTitleParts = (...parts) =>
  parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(' - ');

/**
 * @param {object} level
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string, noindex?: boolean }} [options]
 */
export const buildLevelMeta = (level, t, options = {}) => {
  const { pathname = level?.id ? `/levels/${level.id}` : '/levels', noindex = false } = options;
  const song = getSongDisplayName(level);
  const artist = getArtistDisplayName(level);
  const creator = formatCreatorDisplay(level);
  const url = buildCanonicalUrl(pathname);
  const image = buildThumbnailUrl('level', level?.id);
  const difficulty = level?.difficulty?.name || '';

  const title = t('levelDetail.meta.title', { song, artist });
  const description = t('levelDetail.meta.description', { song, artist, creator, difficulty });

  const jsonLd = [
    creativeWorkJsonLd({
      name: joinTitleParts(song, artist),
      description,
      url,
      creatorName: creator,
      image,
    }),
    breadcrumbJsonLd({
      items: [
        { name: t('level.meta.title'), url: buildCanonicalUrl('/levels') },
        { name: song || t('levelDetail.meta.fallbackName'), url },
      ],
    }),
  ];

  if (level?.videoLink) {
    jsonLd.unshift(
      videoObjectJsonLd({
        name: joinTitleParts(song, artist),
        description,
        url: level.videoLink,
        thumbnailUrl: image,
        uploadDate: level?.createdAt,
      }),
    );
  }

  return {
    title,
    description,
    pathname,
    image,
    type: 'article',
    noindex: noindex || Boolean(level?.isDeleted || level?.isHidden),
    jsonLd,
  };
};

/**
 * @param {object} pass
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string }} [options]
 */
export const buildPassMeta = (pass, t, options = {}) => {
  const { pathname = pass?.id ? `/passes/${pass.id}` : '/passes' } = options;
  const level = pass?.level;
  const song = getSongDisplayName(level);
  const artist = getArtistDisplayName(level);
  const playerName = pass?.player?.name || '';
  const url = buildCanonicalUrl(pathname);
  const image = buildThumbnailUrl('pass', pass?.id);
  const difficulty = level?.difficulty?.name || '';

  const title = t('passDetail.meta.title', { song, artist, playerName });
  const description = t('passDetail.meta.description', {
    playerName,
    song,
    artist,
    difficulty,
    score: pass?.scoreV2,
  });

  const jsonLd = [
    videoObjectJsonLd({
      name: title,
      description,
      url: pass?.videoLink || url,
      thumbnailUrl: image,
      uploadDate: pass?.vidUploadTime || pass?.createdAt,
    }),
    breadcrumbJsonLd({
      items: [
        { name: t('pass.meta.title'), url: buildCanonicalUrl('/passes') },
        ...(level?.id
          ? [{ name: song, url: buildCanonicalUrl(`/levels/${level.id}`) }]
          : []),
        { name: title, url },
      ],
    }),
  ];

  return {
    title,
    description,
    pathname,
    image,
    type: 'article',
    noindex: Boolean(pass?.isDeleted || pass?.isHidden),
    jsonLd,
  };
};

/**
 * @param {object} pack
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string, totalLevels?: number }} [options]
 */
export const buildPackMeta = (pack, t, options = {}) => {
  const linkCode = pack?.linkCode || pack?.id;
  const { pathname = linkCode ? `/packs/${linkCode}` : '/packs', totalLevels = 0 } = options;
  const ownerName = pack?.packOwner?.username || pack?.packOwner?.nickname || 'Unknown';
  const url = buildCanonicalUrl(pathname);
  const image = buildThumbnailUrl('pack', linkCode);

  const title = t('packDetail.meta.title', { name: pack?.name || '' });
  const description = t('packDetail.meta.description', {
    name: pack?.name || '',
    owner: ownerName,
    count: totalLevels,
  });

  return {
    title,
    description,
    pathname,
    image,
    type: 'website',
    noindex: false,
    jsonLd: collectionPageJsonLd({
      name: pack?.name || title,
      description,
      url,
      items: [],
      breadcrumbItems: [
        { name: t('pack.meta.title'), url: buildCanonicalUrl('/packs') },
        { name: pack?.name || title, url },
      ],
    }),
  };
};

/**
 * @param {object} creator
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string, creatorId?: string | number, levelCount?: number }} [options]
 */
export const buildCreatorMeta = (creator, t, options = {}) => {
  const {
    pathname = options.creatorId ? `/creator/${options.creatorId}` : '/creators',
    levelCount = 0,
  } = options;
  const name = creator?.name || '';
  const url = buildCanonicalUrl(pathname);
  const image = resolveMetaImage(creator?.avatarUrl || creator?.bannerUrl);

  const title = t('creators.profile.meta.title', { name });
  const description = t('creators.profile.meta.description', { name, count: levelCount });

  return {
    title,
    description,
    pathname,
    image,
    type: 'profile',
    noindex: false,
    jsonLd: profilePageJsonLd({
      name,
      url,
      description,
      image,
      breadcrumbItems: [
        { name: t('creators.meta.title'), url: buildCanonicalUrl('/creators') },
        { name, url },
      ],
    }),
  };
};

/**
 * @param {object} player
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string, playerId?: string | number, avatarUrl?: string }} [options]
 */
export const buildPlayerMeta = (player, t, options = {}) => {
  const {
    pathname = options.playerId ? `/profile/${options.playerId}` : '/profile',
    avatarUrl,
  } = options;
  const name = player?.name || t('profile.meta.defaultTitle');
  const url = buildCanonicalUrl(pathname);
  const image = buildThumbnailUrl('player', options.playerId || player?.id);

  const title = player?.name
    ? t('profile.meta.title', { name: player.name })
    : t('profile.meta.defaultTitle');
  const description = t('profile.meta.description', { name: player?.name || name });

  return {
    title,
    description,
    pathname,
    image: avatarUrl ? resolveMetaImage(avatarUrl) : image,
    type: 'profile',
    noindex: Boolean(player?.isBanned),
    jsonLd: profilePageJsonLd({
      name,
      url,
      description,
      image: avatarUrl ? resolveMetaImage(avatarUrl) : image,
      breadcrumbItems: [
        { name: t('leaderboard.meta.title'), url: buildCanonicalUrl('/leaderboard') },
        { name, url },
      ],
    }),
  };
};

/**
 * @param {object} song
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string }} [options]
 */
export const buildSongMeta = (song, t, options = {}) => {
  const { pathname = song?.id ? `/songs/${song.id}` : '/songs' } = options;
  const name = song?.name || '';
  const url = buildCanonicalUrl(pathname);

  const title = t('songDetail.meta.title', { name });
  const description = t('songDetail.meta.description', { name });

  return buildStaticPageMeta({
    title,
    description,
    pathname,
    type: 'article',
    jsonLd: [
      creativeWorkJsonLd({ name, description, url }),
      breadcrumbJsonLd({
        items: [
          { name: t('songList.meta.title'), url: buildCanonicalUrl('/songs') },
          { name, url },
        ],
      }),
    ],
  });
};

/**
 * @param {object} artist
 * @param {(key: string, opts?: object) => string} t
 * @param {{ pathname?: string }} [options]
 */
export const buildArtistMeta = (artist, t, options = {}) => {
  const { pathname = artist?.id ? `/artists/${artist.id}` : '/artists' } = options;
  const name = artist?.name || '';
  const url = buildCanonicalUrl(pathname);
  const image = resolveMetaImage(artist?.avatarUrl);

  const title = t('artistDetail.meta.title', { name });
  const description = t('artistDetail.meta.description', { name });

  return buildStaticPageMeta({
    title,
    description,
    pathname,
    image,
    type: 'article',
    jsonLd: profilePageJsonLd({
      name,
      url,
      description,
      image,
      breadcrumbItems: [
        { name: t('artistList.meta.title'), url: buildCanonicalUrl('/artists') },
        { name, url },
      ],
    }),
  });
};

/**
 * @param {object} params
 */
export const buildListPageMeta = ({
  title,
  description,
  pathname,
  image,
  type = 'website',
  breadcrumbParent,
  listItems,
}) =>
  buildStaticPageMeta({
    title,
    description,
    pathname,
    image,
    type,
    jsonLd: [
      collectionPageJsonLd({
        name: title,
        description,
        url: buildCanonicalUrl(pathname),
        items: toSafeArray(listItems),
        breadcrumbItems: breadcrumbParent
          ? [{ name: breadcrumbParent.name, url: breadcrumbParent.url }]
          : undefined,
      }),
    ],
  });

/**
 * @param {object} params
 */
export const buildLeaderboardMeta = ({ title, description, pathname, players }) => {
  const safePlayers = toSafeArray(players);

  return buildStaticPageMeta({
    title,
    description,
    pathname,
    image: '/leaderboard-preview.jpg',
    type: 'website',
    jsonLd: [
      itemListJsonLd({
        name: title,
        items: safePlayers.slice(0, 10)
          .filter((player) => player?.id != null && player?.name)
          .map((player) => ({
            name: player.name,
            url: buildCanonicalUrl(`/profile/${player.id}`),
          })),
      }),
      breadcrumbJsonLd({
        items: [{ name: title, url: buildCanonicalUrl(pathname) }],
      }),
    ],
  });
};

export { buildStaticPageMeta, buildCanonicalUrl };
