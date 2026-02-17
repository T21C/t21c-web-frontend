import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./adminsubmissionpage.css";
import { AccessDenied, MetaTags } from '@/components/common/display';

import { ScrollButton } from '@/components/common/buttons';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import { RefreshIcon } from '@/components/common/icons';
import { useNotification } from '@/contexts/NotificationContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

const SubmissionManagementPage = () => {
  const { t } = useTranslation('pages');
  const currentUrl = window.location.origin + location.pathname;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' or 'passes'
  const [isAutoAllowing, setIsAutoAllowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { pendingLevelSubmissions, pendingPassSubmissions } = useNotification();
  const handleRefresh = () => {
    setIsLoading(true);
    // Dispatch a custom event to trigger refresh in child components
    window.dispatchEvent(new Event('refreshSubmissions'));
    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 1000);
  };

  // Add event listener for when child components finish loading
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoading(false);
    };
    window.addEventListener('submissionsLoadingComplete', handleLoadingComplete);
    
    return () => {
      window.removeEventListener('submissionsLoadingComplete', handleLoadingComplete);
    };
  }, []);

  if (user.permissionFlags === undefined) {
    return (
      <>
        <MetaTags
          title={t('submissionManagement.meta.title')}
          description={t('submissionManagement.meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        
        <div className="submission-admin-page">
          <div className="submissions-admin-container">
            <div className="loader loader-level-detail"/>
          </div>
        </div>
      </>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied 
        metaTitle={t('submissionManagement.meta.title')}
        metaDescription={t('submissionManagement.meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  return (
    <>
      <MetaTags
        title={t('submissionManagement.meta.title')}
        description={t('submissionManagement.meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      
      <div className="submission-admin-page">
        <ScrollButton />
        <div className="submissions-admin-container">
          <div className="header-container">
            <h1>{t('submissionManagement.header.title')}</h1>
            <button 
              className="refresh-button" 
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label={t('submissionManagement.header.refresh')}
            >
              <RefreshIcon color="#fff" size="40px" />
            </button>
          </div>
          
          <div className="submission-tabs">
            <div 
              className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              {t('submissionManagement.tabs.levels')}
              <span className="notification-badge" style={{visibility: pendingLevelSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingLevelSubmissions || pendingLevelSubmissions > 0 && (
                  pendingLevelSubmissions > 99 ? "99+" : pendingLevelSubmissions
                )}
              </span>
            </div>
            
            <div 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              {t('submissionManagement.tabs.passes')}
              <span className="notification-badge" style={{visibility: pendingPassSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingPassSubmissions || pendingPassSubmissions > 0 && (
                  pendingPassSubmissions > 99 ? "99+" : pendingPassSubmissions
                )}
              </span>
            </div>
            {activeTab === 'passes' && (
              <button 
                className="auto-allow-button"
                onClick={() => window.dispatchEvent(new Event('autoAllowPasses'))}
                disabled={isAutoAllowing}
              >
                {t('submissionManagement.tabs.autoAllow')}
                {isAutoAllowing && (
                  <div className="loading-spinner">
                  </div>
                )}
              </button>
            )}
          </div>

          {activeTab === 'levels' ? (
            <LevelSubmissions />
          ) : (
            <PassSubmissions setIsAutoAllowing={setIsAutoAllowing} />
          )}
        </div>
      </div>
    </>
  );
}

export default SubmissionManagementPage;