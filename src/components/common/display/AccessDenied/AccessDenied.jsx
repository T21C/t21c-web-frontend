import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import './accessdenied.css';

const AccessDenied = ({ 
  metaTitle = 'Access Denied | TUF',
  metaDescription = 'Access denied page for The Universal Forums (TUF)',
  currentUrl = window.location.origin + location.pathname
}) => {
  const { t } = useTranslation('components');

  return (
    <>
      <MetaTags
        title={metaTitle}
        description={metaDescription}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      
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