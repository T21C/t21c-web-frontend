import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const MetaTags = ({ 
  title, 
  description, 
  image, 
  url,
  type = 'website'
}) => {
  const siteName = 'The Universal Forums';
  const defaultDescription = 'Explore and share rhythm game content';
  const defaultImage = '/images/logo.png';

  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={description || defaultDescription} />

      {/* OpenGraph metadata */}
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter metadata */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || siteName} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image || defaultImage} />
    </Helmet>
  );
};

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
};

export default MetaTags; 