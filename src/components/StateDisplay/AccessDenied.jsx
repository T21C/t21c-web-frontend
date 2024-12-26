import React from 'react';
import { useTranslation } from 'react-i18next';
import { CompleteNav, MetaTags } from '@/components';
import './accessdenied.css';

const AccessDenied = ({ 
  metaTitle = 'Access Denied | TUF',
  metaDescription = 'Access denied page for The Universal Forums (TUF)',
  currentUrl = window.location.origin + location.pathname
}) => {
  const { t } = useTranslation('components');
  const tState = (key) => t(`stateDisplay.accessDenied.${key}`);

  return (
    <>
      <MetaTags
        title={metaTitle}
        description={metaDescription}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="access-denied-page">
        <div className="access-denied-container">
          <h1>{tState('title')}</h1>
          <p>{tState('message')}</p>
        </div>
      </div>
    </>
  );
};

export default AccessDenied; 