// tuf-search: #MetaTags #metaTags #display
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  buildCanonicalUrl,
  normalizeJsonLdBlocks,
  resolveMetaImage,
  resolveOgLocale,
  SITE_NAME,
} from '@/utils/meta';

const MetaTags = ({
  title,
  description,
  image,
  url,
  pathname,
  type = 'website',
  noindex = false,
  jsonLd = null,
  imageAlt,
  imageWidth = OG_IMAGE_WIDTH,
  imageHeight = OG_IMAGE_HEIGHT,
  helmetKey,
}) => {
  const { i18n } = useTranslation();
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const ogTitle = title || SITE_NAME;
  const canonicalUrl = url || (pathname ? buildCanonicalUrl(pathname) : buildCanonicalUrl('/'));
  const ogImage = resolveMetaImage(image || DEFAULT_OG_IMAGE);
  const ogLocale = resolveOgLocale(i18n.language);
  const robots = noindex ? 'noindex,follow' : 'index,follow';
  const jsonLdBlocks = normalizeJsonLdBlocks(jsonLd);

  return (
    <Helmet key={helmetKey || canonicalUrl}>
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robots} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      {imageAlt ? <meta property="og:image:alt" content={imageAlt} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdBlocks.map((block, index) => (
        <script key={`jsonld-${index}`} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  pathname: PropTypes.string,
  type: PropTypes.string,
  noindex: PropTypes.bool,
  jsonLd: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  imageAlt: PropTypes.string,
  imageWidth: PropTypes.number,
  imageHeight: PropTypes.number,
  helmetKey: PropTypes.string,
};

export default MetaTags;
