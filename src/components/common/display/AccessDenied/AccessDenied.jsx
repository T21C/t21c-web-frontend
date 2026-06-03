// tuf-search: #AccessDenied #accessDenied #display
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import './accessdenied.css';

const AccessDenied = ({
  metaTitle = 'Access Denied',
  metaDescription = 'Access denied page for The Universal Forums (TUF)',
}) => {
  const { t } = useTranslation('components');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: metaTitle,
        description: metaDescription,
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
        noindex: true,
      }),
    [metaTitle, metaDescription, location.pathname],
  );

  return (
    <>
      <MetaTags {...pageMeta} />

      <div className="access-denied-page">
        <div className="access-denied-container page-content">
          <h1>{t('stateDisplay.accessDenied.title')}</h1>
          <p>{t('stateDisplay.accessDenied.message')}</p>
        </div>
      </div>
    </>
  );
};

export default AccessDenied;
