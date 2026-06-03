// tuf-search: #jsonLd #meta #schema
import { buildCanonicalUrl, DEFAULT_DESCRIPTION, SITE_NAME } from './staticMeta';

/**
 * @param {object | object[] | null | undefined} jsonLd
 * @returns {object[]}
 */
export const normalizeJsonLdBlocks = (jsonLd) => {
  if (!jsonLd) return [];
  return Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd];
};

export const siteJsonLd = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: buildCanonicalUrl('/'),
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${buildCanonicalUrl('/levels')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: buildCanonicalUrl('/'),
  },
];

/**
 * @param {{ items: Array<{ name: string, url: string }> }} params
 */
export const breadcrumbJsonLd = ({ items }) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * @param {object} params
 */
export const personJsonLd = ({ name, url, description, image }) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name,
  url,
  ...(description ? { description } : {}),
  ...(image ? { image } : {}),
});

/**
 * @param {object} params
 */
export const profilePageJsonLd = ({ name, url, description, image, breadcrumbItems }) => {
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name,
      url,
      mainEntity: personJsonLd({ name, url, description, image }),
    },
  ];
  if (breadcrumbItems?.length) {
    blocks.push(breadcrumbJsonLd({ items: breadcrumbItems }));
  }
  return blocks;
};

/**
 * @param {object} params
 */
export const videoObjectJsonLd = ({ name, description, url, thumbnailUrl, uploadDate }) => ({
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name,
  description,
  url,
  ...(thumbnailUrl ? { thumbnailUrl } : {}),
  ...(uploadDate ? { uploadDate } : {}),
});

/**
 * @param {object} params
 */
export const creativeWorkJsonLd = ({ name, description, url, creatorName, image }) => ({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name,
  description,
  url,
  ...(image ? { image } : {}),
  ...(creatorName
    ? {
        creator: {
          '@type': 'Person',
          name: creatorName,
        },
      }
    : {}),
});

/**
 * @param {object} params
 */
export const collectionPageJsonLd = ({ name, description, url, items, breadcrumbItems }) => {
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      url,
      hasPart: itemListJsonLd({ name, items }),
    },
  ];
  if (breadcrumbItems?.length) {
    blocks.push(breadcrumbJsonLd({ items: breadcrumbItems }));
  }
  return blocks;
};

/**
 * @param {object} params
 */
export const itemListJsonLd = ({ name, items }) => {
  const safeItems = Array.isArray(items) ? items : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: safeItems.length,
    itemListElement: safeItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
};
