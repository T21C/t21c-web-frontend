// tuf-search: #staticMeta #meta
import { API_BASE, OWN_BASE } from '@/config/env';

/** @param {unknown} value */
export const toSafeArray = (value) => (Array.isArray(value) ? value : []);

export const SITE_NAME = 'The Universal Forums';

export const DEFAULT_DESCRIPTION =
  'A community specialized in custom levels & clears of A Dance of Fire and Ice.';

export const DEFAULT_OG_IMAGE = `${OWN_BASE}/images/logo.svg`;

export const OG_IMAGE_WIDTH = 800;
export const OG_IMAGE_HEIGHT = 420;

/** @param {string} pathname */
export const buildCanonicalUrl = (pathname = '/') => {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${OWN_BASE}${path}`;
};

/**
 * @param {string | undefined | null} image
 * @returns {string}
 */
export const resolveMetaImage = (image) => {
  const raw = String(image ?? '').trim();
  if (!raw) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return `${OWN_BASE}${normalized}`;
};

/**
 * @param {'level' | 'pass' | 'player' | 'pack'} kind
 * @param {string | number} id
 */
export const buildThumbnailUrl = (kind, id) => {
  if (id == null || String(id).trim() === '') return DEFAULT_OG_IMAGE;
  return `${API_BASE}/v2/media/thumbnail/${kind}/${id}`;
};

const OG_LOCALE_MAP = {
  en: 'en_US',
  kr: 'ko_KR',
  cn: 'zh_CN',
  pl: 'pl_PL',
  fr: 'fr_FR',
};

/** @param {string} [language] */
export const resolveOgLocale = (language = 'en') => {
  const normalized = String(language || 'en').toLowerCase();
  return OG_LOCALE_MAP[normalized] || OG_LOCALE_MAP.en;
};

/**
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} params.pathname
 * @param {string} [params.image]
 * @param {string} [params.type]
 * @param {boolean} [params.noindex]
 * @param {object | object[] | null} [params.jsonLd]
 */
export const buildStaticPageMeta = ({
  title,
  description,
  pathname,
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) => ({
  title,
  description: description || DEFAULT_DESCRIPTION,
  pathname,
  image: resolveMetaImage(image),
  type,
  noindex,
  jsonLd,
});
